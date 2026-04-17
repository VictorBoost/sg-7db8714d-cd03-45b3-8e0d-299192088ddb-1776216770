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
          message: "Bot payments disabled - contracts not completed",
          completed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get bot accounts
    const { data: bots } = await supabaseClient
      .from("bot_accounts")
      .select("profile_id")
      .eq("is_active", true);

    if (!bots || bots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No bots available", completed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botIds = bots.map(b => b.profile_id);

    // Get contracts ready to be completed (both parties are bots, status is in_progress)
    const { data: contracts } = await supabaseClient
      .from("contracts")
      .select("*")
      .eq("status", "in_progress")
      .in("client_id", botIds)
      .in("provider_id", botIds)
      .limit(5);

    if (!contracts || contracts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No contracts ready to complete", completed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let completedCount = 0;
    const errors = [];

    for (const contract of contracts) {
      try {
        // Mark contract as pending review
        const { error: contractError } = await supabaseClient
          .from("contracts")
          .update({ status: "pending_review" })
          .eq("id", contract.id);

        if (contractError) {
          errors.push(`Contract ${contract.id}: ${contractError.message}`);
          continue;
        }

        // Create placeholder evidence photos
        const photoUrls = [
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
          "https://images.unsplash.com/photo-1581578968120-c2b1b6ffd163?w=800"
        ];

        for (const url of photoUrls) {
          await supabaseClient
            .from("evidence_photos")
            .insert({
              contract_id: contract.id,
              uploader_id: contract.provider_id,
              photo_url: url,
              photo_type: Math.random() > 0.5 ? "before" : "after"
            });
        }

        // Create review from client
        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
        const reviews = [
          "Excellent work! Very professional and completed on time.",
          "Great service, highly recommended!",
          "Very satisfied with the quality of work.",
          "Professional and reliable. Would hire again.",
          "Outstanding service! Exceeded expectations."
        ];

        await supabaseClient
          .from("reviews")
          .insert({
            contract_id: contract.id,
            client_id: contract.client_id,
            provider_id: contract.provider_id,
            rating,
            comment: reviews[Math.floor(Math.random() * reviews.length)]
          });

        // Mark contract as completed
        await supabaseClient
          .from("contracts")
          .update({ status: "completed" })
          .eq("id", contract.id);

        completedCount++;
      } catch (err) {
        errors.push(`Unexpected error for contract ${contract.id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        completed: completedCount,
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