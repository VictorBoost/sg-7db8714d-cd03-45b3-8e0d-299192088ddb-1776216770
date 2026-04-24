import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia",
});

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("Auto-release job started at:", new Date().toISOString());

    // Get auto-release window from settings (default 10 seconds for testing, 172800 for 48 hours production)
    const { data: settingsData } = await supabaseClient
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "auto_release_window_seconds")
      .maybeSingle();

    const windowSeconds = parseInt(settingsData?.setting_value || "10");
    console.log("Auto-release window:", windowSeconds, "seconds");

    // Find all contracts eligible for auto-release
    const now = new Date();
    const { data: eligibleContracts, error: fetchError } = await supabaseClient
      .from("contracts")
      .select(`
        id,
        stripe_payment_intent_id,
        provider_id,
        client_id,
        auto_release_eligible_at,
        project:projects(title)
      `)
      .eq("payment_status", "held")
      .not("auto_release_eligible_at", "is", null)
      .lte("auto_release_eligible_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching eligible contracts:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${eligibleContracts?.length || 0} contracts eligible for auto-release`);

    let releasedCount = 0;
    const errors: any[] = [];

    for (const contract of eligibleContracts || []) {
      try {
        console.log(`Processing contract ${contract.id}, payment intent: ${contract.stripe_payment_intent_id}`);

        // Capture the payment in Stripe
        await stripe.paymentIntents.capture(contract.stripe_payment_intent_id);

        // Update contract to released status
        const { error: updateError } = await supabaseClient
          .from("contracts")
          .update({
            payment_status: "released",
            payment_captured_at: new Date().toISOString(),
            escrow_released_method: "auto_release",
          })
          .eq("id", contract.id);

        if (updateError) {
          console.error(`Failed to update contract ${contract.id}:`, updateError);
          errors.push({ contractId: contract.id, error: updateError });
          continue;
        }

        // Create notification for provider
        await supabaseClient.from("notifications").insert({
          user_id: contract.provider_id,
          type: "payment_released",
          related_id: contract.id,
          message: `Payment for "${contract.project?.title}" has been auto-released. Funds will arrive in 2-3 business days.`,
        });

        // Create notification for client
        await supabaseClient.from("notifications").insert({
          user_id: contract.client_id,
          type: "payment_released",
          related_id: contract.id,
          message: `Payment for "${contract.project?.title}" was auto-released after the approval period expired.`,
        });

        releasedCount++;
        console.log(`✅ Successfully released payment for contract ${contract.id}`);
      } catch (error) {
        console.error(`Error processing contract ${contract.id}:`, error);
        errors.push({ contractId: contract.id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        releasedCount,
        eligibleCount: eligibleContracts?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
        windowSeconds,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auto-release job error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});