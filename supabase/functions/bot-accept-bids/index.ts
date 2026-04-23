import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if bot payments are enabled
    const { data: paymentSetting } = await supabaseClient
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "bot_payments_enabled")
      .single();

    if (!paymentSetting || paymentSetting.setting_value !== "true") {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Bot payments disabled - skipping bid acceptance" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get open projects with bids from bot clients
    const { data: projects } = await supabaseClient
      .from("projects")
      .select(`
        id,
        title,
        client_id,
        bids!inner(
          id,
          amount,
          provider_id,
          status
        )
      `)
      .eq("status", "open")
      .eq("bids.status", "pending");

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No projects with pending bids" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      accepted: 0,
      errors: [] as string[]
    };

    // Accept bids with 30% probability
    for (const project of projects) {
      try {
        if (Math.random() > 0.3) continue; // 30% chance to accept

        const bids = Array.isArray(project.bids) ? project.bids : [project.bids];
        if (bids.length === 0) continue;

        // Pick a random bid (bots don't always pick the cheapest!)
        const selectedBid = bids[Math.floor(Math.random() * bids.length)];

        // Create contract
        const { data: contract, error: contractError } = await supabaseClient
          .from("contracts")
          .insert({
            project_id: project.id,
            bid_id: selectedBid.id,
            client_id: project.client_id,
            provider_id: selectedBid.provider_id,
            agreed_price: selectedBid.amount,
            status: "awaiting_payment"
          })
          .select()
          .single();

        if (contractError || !contract) {
          results.errors.push(`Contract creation failed: ${contractError?.message}`);
          continue;
        }

        // Update bid and project status
        await supabaseClient.from("bids").update({ status: "accepted" }).eq("id", selectedBid.id);
        await supabaseClient.from("bids").update({ status: "declined" }).eq("project_id", project.id).neq("id", selectedBid.id);
        await supabaseClient.from("projects").update({ status: "in_progress" }).eq("id", project.id);

        // Log activity
        await supabaseClient.from("bot_activity_logs").insert({
          bot_id: project.client_id,
          action_type: "accept_bid",
          details: { contract_id: contract.id, bid_amount: selectedBid.amount }
        });

        results.accepted++;
      } catch (err: any) {
        results.errors.push(`Error accepting bid: ${err.message}`);
      }
    }

    console.log(`Accepted ${results.accepted} bids with ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        accepted: results.accepted,
        errors: results.errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});