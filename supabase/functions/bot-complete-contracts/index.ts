import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_CARDS = [
  "4242424242424242",
  "5555555555554444",
  "378282246310005",
  "6011111111111117",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const { data: paymentSetting } = await supabaseClient
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "bot_payments_enabled")
      .single();

    if (paymentSetting?.setting_value !== "true") {
      return new Response(
        JSON.stringify({ success: true, message: "Bot payments disabled", paid: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: contracts } = await supabaseClient
      .from("contracts")
      .select(`
        id,
        client_id,
        provider_id,
        bids!inner(agreed_price)
      `)
      .eq("status", "accepted")
      .eq("payment_status", "pending")
      .limit(20);

    if (!contracts || contracts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No contracts need payment", paid: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { paid: 0, errors: [] as string[] };

    for (const contract of contracts) {
      try {
        const { data: clientBot } = await supabaseClient
          .from("bot_accounts")
          .select("profile_id")
          .eq("profile_id", contract.client_id)
          .maybeSingle();

        if (!clientBot) continue;

        const amount = (contract.bids as any)?.agreed_price || 100;
        const amountInCents = Math.round(amount * 100);
        const testCard = TEST_CARDS[Math.floor(Math.random() * TEST_CARDS.length)];

        const paymentMethod = await stripe.paymentMethods.create({
          type: "card",
          card: {
            number: testCard,
            exp_month: 12,
            exp_year: 2025,
            cvc: "123",
          },
        });

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "nzd",
          payment_method: paymentMethod.id,
          confirm: true,
          automatic_payment_methods: { enabled: false },
          metadata: {
            contract_id: contract.id,
            is_bot_payment: "true"
          }
        });

        if (paymentIntent.status === "succeeded") {
          await supabaseClient
            .from("contracts")
            .update({
              payment_status: "paid",
              stripe_payment_intent_id: paymentIntent.id
            })
            .eq("id", contract.id);

          await supabaseClient
            .from("bot_activity_logs")
            .insert({
              bot_id: contract.client_id,
              action_type: "complete_payment",
              details: { contract_id: contract.id, amount }
            });

          results.paid++;
        }
      } catch (err: any) {
        results.errors.push(`Payment failed: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, paid: results.paid, errors: results.errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});