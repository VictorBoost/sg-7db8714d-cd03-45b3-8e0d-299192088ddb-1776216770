import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { payoutFridayDateNz } from "@/lib/payoutScheduleNZ";
import { sesEmailService } from "@/services/sesEmailService";

/**
 * Hourly cron:
 * 1) Back-fill ready_for_release_at when dispute windows elapsed.
 * 2) After ready_for_release_at + 48h without client acceptance → notify client + admin + email (48h reject window).
 * 3) After escrow_auto_reject_deadline → schedule stripe_payout_scheduled_for using NZ Wednesday / Friday rules.
 */

const OWNER_EMAIL = "bluetikanz@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const HOUR_MS = 3600000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | {
        synced_ready: number;
        notices_sent: number;
        payouts_scheduled: number;
        errors: string[];
      }
    | { error: string }
  >
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const nowIso = now.toISOString();
  const errors: string[] = [];
  let synced_ready = 0;
  let notices_sent = 0;
  let payouts_scheduled = 0;

  try {
    const { data: syncCandidates, error: syncErr } = await supabase
      .from("contracts")
      .select("id, client_dispute_deadline, provider_dispute_deadline, ready_for_release_at")
      .eq("payment_status", "held")
      .is("ready_for_release_at", null);

    if (syncErr) {
      errors.push(`sync query: ${syncErr.message}`);
    } else {
      for (const row of syncCandidates ?? []) {
        const cOk =
          row.client_dispute_deadline && new Date(row.client_dispute_deadline).getTime() < now.getTime();
        const pOk =
          row.provider_dispute_deadline &&
          new Date(row.provider_dispute_deadline).getTime() < now.getTime();
        if (!cOk || !pOk) continue;

        const { error: up } = await supabase
          .from("contracts")
          .update({ ready_for_release_at: nowIso, updated_at: nowIso })
          .eq("id", row.id);

        if (up) errors.push(`sync ${row.id}: ${up.message}`);
        else synced_ready++;
      }
    }

    const fortyEightHoursAgo = new Date(now.getTime() - 48 * HOUR_MS).toISOString();

    const { data: noticeCandidates, error: nErr } = await supabase
      .from("contracts")
      .select(
        `
        id,
        client_id,
        provider_id,
        ready_for_release_at,
        client_work_accepted_at,
        escrow_auto_notice_sent_at,
        escrow_admin_hold,
        project:projects!contracts_project_id_fkey(title),
        client:profiles!contracts_client_id_fkey(full_name, email),
        provider:profiles!contracts_provider_id_fkey(full_name)
      `
      )
      .eq("payment_status", "held")
      .eq("escrow_admin_hold", false)
      .not("ready_for_release_at", "is", null)
      .is("client_work_accepted_at", null)
      .is("escrow_auto_notice_sent_at", null)
      .lte("ready_for_release_at", fortyEightHoursAgo);

    if (nErr) {
      errors.push(`notice query: ${nErr.message}`);
    } else {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", OWNER_EMAIL)
        .maybeSingle();

      for (const row of noticeCandidates ?? []) {
        const rejectDeadline = new Date(now.getTime() + 48 * HOUR_MS).toISOString();

        const { error: nu } = await supabase
          .from("contracts")
          .update({
            escrow_auto_notice_sent_at: nowIso,
            escrow_auto_reject_deadline: rejectDeadline,
            updated_at: nowIso,
          })
          .eq("id", row.id);

        if (nu) {
          errors.push(`notice update ${row.id}: ${nu.message}`);
          continue;
        }

        notices_sent++;

        const projectTitle = (row.project as { title?: string } | null)?.title || "your contract";
        const clientName = (row.client as { full_name?: string } | null)?.full_name || "there";
        const clientEmail = (row.client as { email?: string } | null)?.email;
        const providerName = (row.provider as { full_name?: string } | null)?.full_name || "Provider";

        await supabase.from("notifications").insert({
          user_id: row.client_id,
          title: "Automatic payout notice",
          message: `You have 48 hours to raise a concern if you do not want escrow released on the next Friday payout for "${projectTitle}".`,
          type: "payment",
          related_contract_id: row.id,
        });

        if (ownerProfile?.id) {
          await supabase.from("notifications").insert({
            user_id: ownerProfile.id,
            title: "Escrow auto-release notice sent",
            message: `Contract ${String(row.id).slice(0, 8)}… — client notified; reject deadline ${rejectDeadline}`,
            type: "payment",
            related_contract_id: row.id,
          });
        }

        if (clientEmail) {
          try {
            await sesEmailService.sendEscrowAutoReleaseWindowNotice(
              clientEmail,
              clientName,
              providerName,
              projectTitle,
              row.id,
              rejectDeadline,
              process.env.NEXT_PUBLIC_SITE_URL || "https://bluetika.co.nz"
            );
          } catch (e) {
            errors.push(`email ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    const { data: finalizeCandidates, error: fErr } = await supabase
      .from("contracts")
      .select("id, escrow_auto_reject_deadline, stripe_payout_scheduled_for, escrow_admin_hold")
      .eq("payment_status", "held")
      .eq("escrow_admin_hold", false)
      .is("client_work_accepted_at", null)
      .not("escrow_auto_reject_deadline", "is", null)
      .lte("escrow_auto_reject_deadline", nowIso)
      .is("stripe_payout_scheduled_for", null);

    if (fErr) {
      errors.push(`finalize query: ${fErr.message}`);
    } else {
      const { data: ownerRow } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", OWNER_EMAIL)
        .maybeSingle();

      for (const row of finalizeCandidates ?? []) {
        const eligibility = now;
        const friday = payoutFridayDateNz(eligibility);

        const { error: fu } = await supabase
          .from("contracts")
          .update({
            stripe_payout_scheduled_for: friday,
            updated_at: nowIso,
          })
          .eq("id", row.id);

        if (fu) errors.push(`finalize ${row.id}: ${fu.message}`);
        else payouts_scheduled++;

        if (ownerRow?.id) {
          await supabase.from("notifications").insert({
            user_id: ownerRow.id,
            title: "Escrow payout queued (auto path)",
            message: `Contract ${String(row.id).slice(0, 8)}… scheduled NZ Friday ${friday}.`,
            type: "payment",
            related_contract_id: row.id,
          });
        }
      }
    }

    return res.status(200).json({
      synced_ready,
      notices_sent,
      payouts_scheduled,
      errors,
    });
  } catch (e) {
    console.error("auto-release-pipeline:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "pipeline failed" });
  }
}
