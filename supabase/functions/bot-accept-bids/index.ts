import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

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
          message: "Bot payments disabled - bids not accepted",
          accepted: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active provider bots
    const { data: providerBots } = await supabaseClient
      .from("bot_accounts")
      .select("profile_id")
      .eq("is_active", true)
      .eq("bot_type", "provider");

    if (!providerBots || providerBots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No provider bots available", accepted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerBotIds = providerBots.map(b => b.profile_id);

    // Get pending bids from bot providers on bot client projects
    const { data: bids } = await supabaseClient
      .from("bids")
      .select(`
        id,
        provider_id,
        project_id,
        bid_amount,
        projects!inner(client_id)
      `)
      .eq("status", "pending")
      .in("provider_id", providerBotIds)
      .limit(10);

    if (!bids || bids.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending bids to accept", accepted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let acceptedCount = 0;
    const errors = [];

    // Accept random bids (50% acceptance rate)
    for (const bid of bids) {
      if (Math.random() > 0.5) continue;

      try {
        // Accept the bid
        const { error: bidError } = await supabaseClient
          .from("bids")
          .update({ status: "accepted" })
          .eq("id", bid.id);

        if (bidError) {
          errors.push(`Bid ${bid.id}: ${bidError.message}`);
          continue;
        }

        // Create contract
        const { error: contractError } = await supabaseClient
          .from("contracts")
          .insert({
            project_id: bid.project_id,
            bid_id: bid.id,
            client_id: (bid.projects as any).client_id,
            provider_id: bid.provider_id,
            agreed_amount: bid.bid_amount,
            final_amount: bid.bid_amount,
            status: "awaiting_payment"
          });

        if (contractError) {
          errors.push(`Contract for bid ${bid.id}: ${contractError.message}`);
        } else {
          acceptedCount++;
        }
      } catch (err) {
        errors.push(`Unexpected error for bid ${bid.id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accepted: acceptedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});