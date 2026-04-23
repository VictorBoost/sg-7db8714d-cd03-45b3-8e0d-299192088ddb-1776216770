import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sesEmailService } from "@/services/sesEmailService";
import { emailLogService } from "@/services/emailLogService";
import { notificationService } from "@/services/notificationService";

type Bid = Database["public"]["Tables"]["bids"]["Row"];

export const bidService = {
  async submitBid(projectId: string, providerId: string, bidAmount: number, coverLetter: string) {
    console.log("submitBid:", { projectId, providerId, bidAmount });

    const { data, error } = await supabase
      .from("bids")
      .insert({
        project_id: projectId,
        provider_id: providerId,
        bid_amount: bidAmount,
        cover_letter: coverLetter,
        status: "submitted",
      })
      .select(`
        *,
        project:projects(title, client_id, id),
        provider:profiles!bids_provider_id_fkey(full_name, email)
      `)
      .single();

    console.log("submitBid result:", { data, error });

    if (error) {
      console.error("Failed to submit bid:", error);
      return { data: null, error };
    }

    // Send first bid submitted email to provider
    if (data.provider && data.project) {
      const emailSent = await sesEmailService.sendFirstBidSubmitted(
        data.provider.email,
        data.provider.full_name || "Provider",
        data.project.title,
        data.project.id,
        bidAmount,
        process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"
      );

      await emailLogService.logEmail({
        recipient_email: data.provider.email,
        email_type: "first_bid_submitted",
        status: emailSent ? "sent" : "failed",
        metadata: { bid_id: data.id, project_id: projectId }
      });
    }

    // Create notification for client
    if (data.project?.client_id) {
      await notificationService.createNotification({
        user_id: data.project.client_id,
        type: "new_bid",
        title: "New Bid Received",
        message: `${data.provider?.full_name || "A provider"} submitted a bid of NZD $${bidAmount} on your project`,
        link: `/project/${projectId}`,
      });
    }

    return { data, error: null };
  },

  async acceptBid(bidId: string, clientId: string) {
    console.log("acceptBid:", { bidId, clientId });

    // Get bid details with all related info
    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .select(`
        *,
        project:projects(
          title,
          client_id,
          id,
          client:profiles!projects_client_id_fkey(email, full_name)
        ),
        provider:profiles!bids_provider_id_fkey(email, full_name)
      `)
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      console.error("Failed to fetch bid:", bidError);
      return { data: null, error: bidError };
    }

    // Verify client owns the project
    if (bid.project?.client_id !== clientId) {
      return { data: null, error: new Error("Unauthorized") };
    }

    // Accept the bid
    const { data: acceptedBid, error: updateError } = await supabase
      .from("bids")
      .update({ status: "accepted" })
      .eq("id", bidId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to accept bid:", updateError);
      return { data: null, error: updateError };
    }

    // Decline other bids on the same project
    const { data: otherBids } = await supabase
      .from("bids")
      .select(`
        id,
        provider:profiles!bids_provider_id_fkey(email, full_name)
      `)
      .eq("project_id", bid.project_id)
      .neq("id", bidId)
      .eq("status", "submitted");

    if (otherBids && otherBids.length > 0) {
      await supabase
        .from("bids")
        .update({ status: "declined" })
        .eq("project_id", bid.project_id)
        .neq("id", bidId);

      // Send decline emails to other providers
      for (const otherBid of otherBids) {
        if (otherBid.provider) {
          const emailSent = await sesEmailService.sendBidDeclinedEmail(
            otherBid.provider.email,
            otherBid.provider.full_name || "Provider",
            bid.project?.title || "Project",
            process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"
          );

          await emailLogService.logEmail({
            recipient_email: otherBid.provider.email,
            email_type: "bid_declined",
            status: emailSent ? "sent" : "failed",
            metadata: { bid_id: otherBid.id, project_id: bid.project_id }
          });
        }
      }
    }

    // Create contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        project_id: bid.project_id,
        client_id: clientId,
        provider_id: bid.provider_id,
        bid_id: bidId,
        agreed_price: bid.bid_amount,
        final_amount: bid.bid_amount,
        status: "active",
        payment_status: "pending",
      })
      .select()
      .single();

    if (contractError) {
      console.error("Failed to create contract:", contractError);
      return { data: null, error: contractError };
    }

    // Send acceptance notification email to PROVIDER
    if (bid.provider) {
      const providerEmailSent = await sesEmailService.sendEmail({
        to: bid.provider.email,
        subject: "BlueTika: Your Bid Was Accepted! 🎉",
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <body>
            <h2>Congratulations! Your Bid Was Accepted</h2>
            <p>Kia ora ${bid.provider.full_name || "Provider"},</p>
            <p>Great news! Your bid of <strong>NZD $${bid.bid_amount}</strong> for <strong>${bid.project?.title}</strong> has been accepted.</p>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>The client will proceed to payment</li>
              <li>You'll be notified when payment is confirmed</li>
              <li>Complete the work as agreed</li>
              <li>Submit evidence photos</li>
            </ul>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/contracts">View Contract</a></p>
          </body>
          </html>
        `
      });

      await emailLogService.logEmail({
        recipient_email: bid.provider.email,
        email_type: "bid_accepted_provider",
        status: providerEmailSent ? "sent" : "failed",
        metadata: { bid_id: bidId, contract_id: contract.id }
      });
    }

    // Send acceptance notification email to CLIENT
    if (bid.project?.client) {
      const clientEmailSent = await sesEmailService.sendEmail({
        to: bid.project.client.email,
        subject: "BlueTika: Bid Accepted - Next Steps",
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <body>
            <h2>Bid Accepted Successfully</h2>
            <p>Kia ora ${bid.project.client.full_name || "Client"},</p>
            <p>You've accepted the bid from <strong>${bid.provider?.full_name || "Provider"}</strong> for <strong>${bid.project.title}</strong>.</p>
            <p><strong>Amount:</strong> NZD $${bid.bid_amount}</p>
            <p><strong>Next Step:</strong> Please proceed to payment to secure the service.</p>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/checkout/${contract.id}">Proceed to Payment</a></p>
          </body>
          </html>
        `
      });

      await emailLogService.logEmail({
        recipient_email: bid.project.client.email,
        email_type: "bid_accepted_client",
        status: clientEmailSent ? "sent" : "failed",
        metadata: { bid_id: bidId, contract_id: contract.id }
      });
    }

    // Create notifications
    await notificationService.createNotification({
      user_id: bid.provider_id,
      type: "bid_accepted",
      title: "Bid Accepted! 🎉",
      message: `Your bid for "${bid.project?.title}" was accepted. Await payment confirmation.`,
      link: `/contracts`,
    });

    if (bid.project?.client_id) {
      await notificationService.createNotification({
        user_id: bid.project.client_id,
        type: "bid_accepted",
        title: "Bid Accepted",
        message: `You accepted the bid from ${bid.provider?.full_name}. Please proceed to payment.`,
        link: `/checkout/${contract.id}`,
      });
    }

    return { data: contract, error: null };
  },

  async getBidsByProject(projectId: string) {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        provider:profiles!bids_provider_id_fkey(
          id,
          full_name,
          avatar_url,
          bio,
          provider_tier,
          tier_sales_12m,
          total_reviews,
          average_rating,
          verified_status,
          verification_badges
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    console.log("getBidsByProject:", { data, error });
    if (error) console.error("Failed to fetch bids:", error);

    return { data: data || [], error };
  },

  async getBidsByProvider(providerId: string) {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        project:projects(
          id,
          title,
          description,
          location,
          status,
          created_at,
          client:profiles!projects_client_id_fkey(full_name, avatar_url)
        )
      `)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    console.log("getBidsByProvider:", { data, error });
    if (error) console.error("Failed to fetch provider bids:", error);

    return { data: data || [], error };
  },

  async updateBid(bidId: string, updates: Partial<Bid>) {
    const { data, error } = await supabase
      .from("bids")
      .update(updates)
      .eq("id", bidId)
      .select()
      .single();

    console.log("updateBid:", { data, error });
    if (error) console.error("Failed to update bid:", error);

    return { data, error };
  },

  async deleteBid(bidId: string, providerId: string) {
    const { data: bid } = await supabase
      .from("bids")
      .select("provider_id, status")
      .eq("id", bidId)
      .single();

    if (!bid || bid.provider_id !== providerId) {
      return { data: null, error: new Error("Unauthorized") };
    }

    if (bid.status !== "submitted") {
      return { data: null, error: new Error("Cannot delete accepted or declined bids") };
    }

    const { error } = await supabase
      .from("bids")
      .delete()
      .eq("id", bidId);

    return { data: !error, error };
  },
};