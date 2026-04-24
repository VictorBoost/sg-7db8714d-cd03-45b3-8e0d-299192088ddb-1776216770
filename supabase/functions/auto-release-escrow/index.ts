import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    console.log("🔄 Auto-release escrow cron job started");

    // FOR TESTING: Use 10 seconds (0.00278 hours)
    // FOR PRODUCTION: Use 48 hours
    const RELEASE_WINDOW_HOURS = 0.00278; // 10 seconds for testing

    // Find contracts eligible for auto-release
    const now = new Date();
    const releaseThreshold = new Date(now.getTime() - RELEASE_WINDOW_HOURS * 60 * 60 * 1000);

    const { data: contracts, error: fetchError } = await supabase
      .from("contracts")
      .select(`
        id,
        stripe_payment_intent_id,
        project:projects(title),
        provider:profiles!contracts_provider_id_fkey(full_name),
        client:profiles!contracts_client_id_fkey(full_name)
      `)
      .eq("payment_status", "held")
      .not("stripe_payment_intent_id", "is", null)
      .lte("auto_release_eligible_at", releaseThreshold.toISOString());

    if (fetchError) {
      console.error("Error fetching contracts:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${contracts?.length || 0} contracts eligible for auto-release`);

    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No contracts eligible for auto-release",
        released: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process each contract
    const results = [];
    for (const contract of contracts) {
      try {
        console.log(`Processing contract ${contract.id}`);

        // Capture payment via Stripe
        const captureResponse = await fetch("https://api.stripe.com/v1/payment_intents/" + contract.stripe_payment_intent_id + "/capture", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!captureResponse.ok) {
          const error = await captureResponse.json();
          console.error(`Failed to capture payment for contract ${contract.id}:`, error);
          results.push({ contractId: contract.id, success: false, error: error.error?.message });
          continue;
        }

        // Update contract status
        const { error: updateError } = await supabase
          .from("contracts")
          .update({
            payment_status: "released",
            payment_captured_at: new Date().toISOString(),
            escrow_released_method: "auto_release",
          })
          .eq("id", contract.id);

        if (updateError) {
          console.error(`Failed to update contract ${contract.id}:`, updateError);
          results.push({ contractId: contract.id, success: false, error: updateError.message });
          continue;
        }

        // Send notification to provider
        await supabase.from("notifications").insert({
          user_id: contract.provider?.id,
          type: "payment_released",
          related_id: contract.id,
          message: `Payment for "${contract.project?.title}" has been auto-released. Funds will arrive in 2-3 business days.`,
        });

        console.log(`✅ Successfully released payment for contract ${contract.id}`);
        results.push({ contractId: contract.id, success: true });
      } catch (error) {
        console.error(`Error processing contract ${contract.id}:`, error);
        results.push({ 
          contractId: contract.id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Auto-release completed: ${successCount}/${contracts.length} successful`);

    return new Response(JSON.stringify({ 
      success: true,
      released: successCount,
      total: contracts.length,
      results,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error in auto-release:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});