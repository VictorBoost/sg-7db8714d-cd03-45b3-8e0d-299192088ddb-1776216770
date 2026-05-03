import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { payoutFridayDateNz } from "@/lib/payoutScheduleNZ";
import { sesEmailService } from "@/services/sesEmailService";

const OWNER_EMAIL = "bluetikanz@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function userIdFromRequest(req: NextApiRequest): Promise<string | null> {
  const raw = req.headers.authorization || "";
  const token = raw.replace(/^Bearer\s+/i, "").trim() || req.cookies["sb-access-token"];
  if (!token) return null;
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const userId = await userIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { contractId } = req.body as { contractId?: string };
  if (!contractId) {
    return res.status(400).json({ error: "contractId required" });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: contract, error: cErr } = await admin
    .from("contracts")
    .select(
      `
      id,
      client_id,
      payment_status,
      client_work_accepted_at,
      stripe_payout_scheduled_for,
      escrow_admin_hold,
      provider_id,
      project:projects!contracts_project_id_fkey(title),
      client:profiles!contracts_client_id_fkey(full_name, email),
      provider:profiles!contracts_provider_id_fkey(full_name, email)
    `
    )
    .eq("id", contractId)
    .single();

  if (cErr || !contract) {
    return res.status(404).json({ error: "Contract not found" });
  }

  if (contract.client_id !== userId) {
    return res.status(403).json({ error: "Only the client can accept completed work" });
  }

  if (contract.payment_status !== "held") {
    return res.status(400).json({ error: "Payment is not in escrow (held)" });
  }

  if (contract.escrow_admin_hold) {
    return res.status(400).json({ error: "Payment is on admin hold — contact BlueTika support" });
  }

  const acceptedAt = new Date().toISOString();
  const payoutFriday = payoutFridayDateNz(new Date(acceptedAt));

  const { error: upErr } = await admin
    .from("contracts")
    .update({
      client_work_accepted_at: acceptedAt,
      stripe_payout_scheduled_for: payoutFriday,
      updated_at: acceptedAt,
    })
    .eq("id", contractId);

  if (upErr) {
    console.error("schedule-client-payout:", upErr);
    return res.status(500).json({ error: upErr.message });
  }

  const projectTitle = (contract.project as { title?: string } | null)?.title || "Your project";
  const providerName =
    (contract.provider as { full_name?: string } | null)?.full_name || "your provider";

  await admin.from("notifications").insert({
    user_id: contract.provider_id,
    title: "Client approved completed work",
    message: `Payment for "${projectTitle}" is queued for the next Friday payout (${payoutFriday} NZ batch).`,
    type: "payment",
    related_contract_id: contractId,
  });

  const { data: ownerProfile } = await admin.from("profiles").select("id").eq("email", OWNER_EMAIL).maybeSingle();
  if (ownerProfile?.id) {
    await admin.from("notifications").insert({
      user_id: ownerProfile.id,
      title: "Escrow: client accepted work",
      message: `Contract ${contractId.slice(0, 8)}… — Friday payout ${payoutFriday}.`,
      type: "payment",
      related_contract_id: contractId,
    });
  }

  const providerEmail = (contract.provider as { email?: string } | null)?.email;
  if (providerEmail) {
    try {
      await sesEmailService.sendEmail({
        to: providerEmail,
        subject: `Payment queued — ${projectTitle}`,
        htmlBody: `
          <p>Kia ora ${providerName},</p>
          <p>The client has accepted completed work on <strong>${projectTitle}</strong>.</p>
          <p>Funds remain protected until BlueTika&apos;s weekly Friday payout run (NZ schedule). Expected batch date: <strong>${payoutFriday}</strong>.</p>
          <p>You&apos;ll receive another confirmation once Stripe transfers complete.</p>
        `,
      });
    } catch (e) {
      console.error("schedule-client-payout provider email:", e);
    }
  }

  return res.status(200).json({
    success: true,
    stripe_payout_scheduled_for: payoutFriday,
    client_work_accepted_at: acceptedAt,
  });
}
