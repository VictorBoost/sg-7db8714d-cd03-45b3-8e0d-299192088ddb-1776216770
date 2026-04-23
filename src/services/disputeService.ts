import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sesEmailService } from "@/services/sesEmailService";
import { emailLogService } from "@/services/emailLogService";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];

export const disputeService = {
  async raiseDispute(contractId: string, raisedBy: string, raiserRole: "client" | "provider", reason: string, description: string) {
    console.log("raiseDispute:", { contractId, raisedBy, raiserRole, reason });

    // Get contract details for notifications
    const { data: contract } = await supabase
      .from("contracts")
      .select(`
        *,
        project:projects(title),
        client:profiles!contracts_client_id_fkey(email, full_name),
        provider:profiles!contracts_provider_id_fkey(email, full_name)
      `)
      .eq("id", contractId)
      .single();

    const { data, error } = await supabase
      .from("disputes")
      .insert({
        contract_id: contractId,
        raised_by: raisedBy,
        raiser_role: raiserRole,
        reason,
        description,
        status: "open",
      })
      .select()
      .single();

    console.log("raiseDispute result:", { data, error });
    if (error) {
      console.error("Failed to raise dispute:", error);
      return { data: null, error };
    }

    // Update contract status
    await supabase
      .from("contracts")
      .update({ status: "disputed" })
      .eq("id", contractId);

    // Send email to admin
    if (contract?.project) {
      const adminEmailSent = await sesEmailService.sendAdminDisputeNotification(
        contractId,
        contract.project.title,
        raiserRole === "client" ? contract.client?.full_name || "Client" : contract.provider?.full_name || "Provider",
        raiserRole,
        process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"
      );

      await emailLogService.logEmail({
        recipient_email: "admin@bluetika.co.nz",
        email_type: "dispute_raised_admin",
        status: adminEmailSent ? "sent" : "failed",
        metadata: { dispute_id: data.id, contract_id: contractId }
      });

      // Send email to OTHER party (not the one who raised it)
      const otherParty = raiserRole === "client" ? contract.provider : contract.client;
      if (otherParty) {
        const otherPartyEmailSent = await sesEmailService.sendEmail({
          to: otherParty.email,
          subject: "BlueTika: Dispute Raised on Your Contract",
          htmlBody: `
            <h2>Dispute Notification</h2>
            <p>Kia ora ${otherParty.full_name || "User"},</p>
            <p>A dispute has been raised for <strong>${contract.project.title}</strong>.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p>Our team will review this dispute and work towards a fair resolution. You'll be contacted shortly.</p>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/contracts">View Contract</a></p>
          `
        });

        await emailLogService.logEmail({
          recipient_email: otherParty.email,
          email_type: "dispute_raised_notification",
          status: otherPartyEmailSent ? "sent" : "failed",
          metadata: { dispute_id: data.id, contract_id: contractId }
        });
      }

      // Send confirmation email to the person who raised it
      const raiser = raiserRole === "client" ? contract.client : contract.provider;
      if (raiser) {
        const raiserEmailSent = await sesEmailService.sendEmail({
          to: raiser.email,
          subject: "BlueTika: Your Dispute Has Been Submitted",
          htmlBody: `
            <h2>Dispute Submitted</h2>
            <p>Kia ora ${raiser.full_name || "User"},</p>
            <p>Your dispute for <strong>${contract.project.title}</strong> has been submitted successfully.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Our team will review this dispute and contact you within 24-48 hours. We're committed to fair resolution.</p>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/contracts">View Contract</a></p>
          `
        });

        await emailLogService.logEmail({
          recipient_email: raiser.email,
          email_type: "dispute_raised_confirmation",
          status: raiserEmailSent ? "sent" : "failed",
          metadata: { dispute_id: data.id, contract_id: contractId }
        });
      }
    }

    return { data, error: null };
  },

  async getDisputesByContract(contractId: string) {
    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });

    console.log("getDisputesByContract:", { data, error });
    if (error) console.error("Failed to fetch disputes:", error);

    return { data: data || [], error };
  },

  async getAllDisputes() {
    const { data, error } = await supabase
      .from("disputes")
      .select(`
        *,
        contract:contracts(
          project:projects(title),
          client:profiles!contracts_client_id_fkey(full_name, email),
          provider:profiles!contracts_provider_id_fkey(full_name, email)
        )
      `)
      .order("created_at", { ascending: false });

    console.log("getAllDisputes:", { data, error });
    if (error) console.error("Failed to fetch all disputes:", error);

    return { data: data || [], error };
  },

  async resolveDispute(
    disputeId: string,
    resolutionType: "refund_client" | "pay_provider" | "split_payment" | "custom",
    resolutionReason: string,
    refundAmount?: number,
    payoutAmount?: number
  ) {
    console.log("resolveDispute:", { disputeId, resolutionType, resolutionReason });

    // Get dispute with contract details
    const { data: dispute } = await supabase
      .from("disputes")
      .select(`
        *,
        contract:contracts(
          *,
          project:projects(title),
          client:profiles!contracts_client_id_fkey(email, full_name),
          provider:profiles!contracts_provider_id_fkey(email, full_name)
        )
      `)
      .eq("id", disputeId)
      .single();

    const { data, error } = await supabase
      .from("disputes")
      .update({
        status: "resolved",
        resolution_type: resolutionType,
        resolution_reason: resolutionReason,
        refund_amount: refundAmount,
        payout_amount: payoutAmount,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
      .select()
      .single();

    console.log("resolveDispute result:", { data, error });
    if (error) {
      console.error("Failed to resolve dispute:", error);
      return { data: null, error };
    }

    // Update contract status
    if (dispute?.contract_id) {
      await supabase
        .from("contracts")
        .update({ status: "completed" })
        .eq("id", dispute.contract_id);
    }

    // Send resolution emails to BOTH parties
    if (dispute?.contract?.client) {
      const clientEmailSent = await sesEmailService.sendDisputeResolutionNotification(
        dispute.contract.client.email,
        dispute.contract.client.full_name || "Client",
        "client",
        dispute.contract.project?.title || "Project",
        resolutionType,
        resolutionReason,
        refundAmount,
        process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"
      );

      await emailLogService.logEmail({
        recipient_email: dispute.contract.client.email,
        email_type: "dispute_resolved_client",
        status: clientEmailSent ? "sent" : "failed",
        metadata: { dispute_id: disputeId, resolution_type: resolutionType }
      });
    }

    if (dispute?.contract?.provider) {
      const providerEmailSent = await sesEmailService.sendDisputeResolutionNotification(
        dispute.contract.provider.email,
        dispute.contract.provider.full_name || "Provider",
        "provider",
        dispute.contract.project?.title || "Project",
        resolutionType,
        resolutionReason,
        payoutAmount,
        process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"
      );

      await emailLogService.logEmail({
        recipient_email: dispute.contract.provider.email,
        email_type: "dispute_resolved_provider",
        status: providerEmailSent ? "sent" : "failed",
        metadata: { dispute_id: disputeId, resolution_type: resolutionType }
      });
    }

    return { data, error: null };
  },
};