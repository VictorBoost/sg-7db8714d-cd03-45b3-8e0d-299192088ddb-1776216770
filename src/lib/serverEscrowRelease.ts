import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as stripeEscrow from "@/lib/stripe-escrow";
import { sendPaymentNotification } from "@/lib/email-sender";
import { emailLogService } from "@/services/emailLogService";

export type EscrowReleaseMethod =
  | "client_approval"
  | "auto_release"
  | "admin_release"
  | "scheduled_friday"
  | "auto_after_review_window";

export interface ReleaseCapturedEscrowResult {
  ok: boolean;
  error?: string;
  transferId?: string;
}

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key);
}

/**
 * Stripe transfer + DB updates for a captured escrow row (matches `/api/escrow/release`).
 */
export async function releaseCapturedEscrowToProvider(
  contractId: string,
  releaseMethod: EscrowReleaseMethod
): Promise<ReleaseCapturedEscrowResult> {
  const supabase = admin();

  const { data: payment, error: paymentError } = await supabase
    .from("payment_tracking")
    .select(
      `
      *,
      provider:profiles!payment_tracking_provider_id_fkey(stripe_account_id, email),
      client:profiles!payment_tracking_client_id_fkey(email)
    `
    )
    .eq("contract_id", contractId)
    .eq("status", "captured")
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: paymentError?.message || "Payment not found or not captured" };
  }

  const provider = payment.provider as { stripe_account_id?: string | null; email?: string | null } | null;
  const client = payment.client as { email?: string | null } | null;

  if (!provider?.stripe_account_id) {
    return { ok: false, error: "Provider does not have a connected Stripe account" };
  }

  const amountToProvider = payment.amount_nzd * (1 - 0.02);

  const releaseResult = await stripeEscrow.releasePayment(
    payment.stripe_payment_intent_id!,
    provider.stripe_account_id,
    amountToProvider
  );

  if (!releaseResult.success) {
    return { ok: false, error: releaseResult.error };
  }

  const releasedAt = new Date().toISOString();

  const { error: updatePtError } = await supabase
    .from("payment_tracking")
    .update({
      status: "released",
      stripe_transfer_id: releaseResult.transferId,
      release_method: releaseMethod,
      released_at: releasedAt,
      approved_at: releaseMethod === "client_approval" ? releasedAt : null,
    })
    .eq("id", payment.id);

  if (updatePtError) {
    return { ok: false, error: updatePtError.message };
  }

  await supabase
    .from("contracts")
    .update({
      payment_status: "released",
      funds_released_at: releasedAt,
      escrow_released_method: releaseMethod,
      completed_at: releasedAt,
      status: "completed",
      updated_at: releasedAt,
    })
    .eq("id", contractId);

  if (client?.email && provider?.email) {
    try {
      await sendPaymentNotification(client.email, provider.email, payment.amount_nzd);
      await emailLogService.logEmail(client.email, "payment_released_client", "sent", {
        contract_id: contractId,
      });
      await emailLogService.logEmail(provider.email, "payment_released_provider", "sent", {
        contract_id: contractId,
      });
    } catch (emailError: unknown) {
      console.error("releaseCapturedEscrowToProvider email:", emailError);
    }
  }

  return { ok: true, transferId: releaseResult.transferId };
}
