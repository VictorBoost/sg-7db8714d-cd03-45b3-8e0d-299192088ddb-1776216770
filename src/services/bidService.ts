import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { sesEmailService } from "./sesEmailService";

export type Bid = Tables<"bids">;

export const bidService = {
  async createBid(bidData: Omit<Bid, "id" | "created_at">): Promise<{ data: Bid | null; error: any }> {
    const { data, error } = await supabase
      .from("bids")
      .insert(bidData)
      .select()
      .single();

    if (data && !error) {
      // Check if this is the provider's first bid and send email
      await this.checkAndSendFirstBidEmail(bidData.provider_id, data);
    }

    return { data, error };
  },

  async checkAndSendFirstBidEmail(providerId: string, bid: Bid): Promise<void> {
    try {
      // Count total bids by this provider
      const { count } = await supabase
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", providerId);

      // If this is their first bid, send welcome email
      if (count === 1) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", providerId)
          .single();

        const { data: project } = await supabase
          .from("projects")
          .select("title")
          .eq("id", bid.project_id)
          .single();

        if (profile?.email && profile?.full_name && project?.title) {
          await sesEmailService.sendFirstBidSubmitted(
            profile.email,
            profile.full_name,
            project.title,
            bid.project_id,
            bid.amount,
            "https://bluetika.co.nz"
          );
        }
      }
    } catch (error) {
      console.error("Error checking/sending first bid email:", error);
    }
  },

  async getBidsByProject(projectId: string): Promise<{ data: Bid[] | null; error: any }> {
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    
    return { data, error };
  },

  async updateBidStatus(bidId: string, status: "pending" | "accepted" | "rejected") {
    const { data, error } = await supabase
      .from("bids")
      .update({ status })
      .eq("id", bidId)
      .select()
      .single();

    console.log("updateBidStatus:", { data, error });
    if (error) console.error("Bid status update error:", error);
    return { data, error };
  },

  async getProjectBids(projectId: string) {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        profiles!bids_provider_id_fkey(
          id,
          full_name,
          email,
          phone,
          bio,
          average_rating,
          total_reviews,
          response_rate,
          commission_tier,
          verification_status
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    console.log("getProjectBids:", { data, error });
    if (error) console.error("Bids fetch error:", error);
    return { data, error };
  },

  async getProviderBids(providerId: string) {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        *,
        projects!bids_project_id_fkey(
          id,
          title,
          budget,
          location,
          status,
          category:categories!projects_category_id_fkey(name)
        )
      `)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    console.log("getProviderBids:", { data, error });
    if (error) console.error("Provider bids fetch error:", error);
    return { data, error };
  },

  async acceptBid(bidId: string, projectId: string, clientId: string) {
    // Get the bid details first
    const { data: bidData, error: bidFetchError } = await supabase
      .from("bids")
      .select("*, profiles!bids_provider_id_fkey(email, full_name)")
      .eq("id", bidId)
      .single();

    if (bidFetchError) {
      console.error("Bid fetch error:", bidFetchError);
      return { data: null, error: bidFetchError };
    }

    // Get project title for email
    const { data: projectData } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .single();

    // Update the accepted bid
    const { error: acceptError } = await supabase
      .from("bids")
      .update({ status: "accepted" })
      .eq("id", bidId);

    if (acceptError) {
      console.error("Bid acceptance error:", acceptError);
      return { data: null, error: acceptError };
    }

    // Get all pending bids that will be declined (for email notifications)
    const { data: pendingBids } = await supabase
      .from("bids")
      .select("id, profiles!bids_provider_id_fkey(email, full_name)")
      .eq("project_id", projectId)
      .neq("id", bidId)
      .eq("status", "pending");

    // Auto-decline all other pending bids for this project
    const { error: declineError } = await supabase
      .from("bids")
      .update({ status: "rejected" })
      .eq("project_id", projectId)
      .neq("id", bidId)
      .eq("status", "pending");

    if (declineError) {
      console.error("Auto-decline error:", declineError);
    }

    // Send email notifications to declined service providers
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://bluetika.co.nz";
    if (pendingBids && pendingBids.length > 0 && projectData) {
      await Promise.all(
        pendingBids.map(bid => {
          if (bid.profiles?.email) {
            return sendBidDeclinedEmail(
              bid.profiles.email,
              bid.profiles.full_name || "there",
              projectData.title,
              baseUrl
            );
          }
          return Promise.resolve();
        })
      );
    }

    // Create the contract
    const { data: contractData, error: contractError } = await supabase
      .from("contracts")
      .insert({
        project_id: projectId,
        provider_id: bidData.provider_id,
        client_id: clientId,
        bid_id: bidId,
        final_amount: bidData.amount,
        status: "active",
      })
      .select()
      .single();

    if (contractError) {
      console.error("Contract creation error:", contractError);
      return { data: null, error: contractError };
    }

    // Update project status to in_progress
    await supabase
      .from("projects")
      .update({ status: "in_progress" })
      .eq("id", projectId);

    console.log("acceptBid:", { bidData, contractData });
    return { data: contractData, error: null };
  },

  async uploadTradeCertificate(file: File, providerId: string): Promise<string | null> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${providerId}-${Date.now()}.${fileExt}`;
    const filePath = `trade-certificates/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-media")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Trade certificate upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("project-media")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },
};