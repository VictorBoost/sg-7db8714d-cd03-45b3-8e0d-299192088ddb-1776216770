import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chargeId } = req.body;

    if (!chargeId) {
      return res.status(400).json({ error: "Charge ID is required" });
    }

    // Get charge details with contract and provider info
    const { data: charge, error: chargeError } = await supabase
      .from("additional_charges")
      .select(`
        amount,
        status,
        contract_id,
        contracts!additional_charges_contract_id_fkey(
          provider_id,
          profiles!contracts_provider_id_fkey(
            stripe_account_id,
            stripe_onboarding_complete
          )
        )
      `)
      .eq("id", chargeId)
      .single();

    if (chargeError || !charge) {
      return res.status(404).json({ error: "Charge not found" });
    }

    if (charge.status !== "approved") {
      return res.status(400).json({ error: "Charge is not approved" });
    }

    const contract = charge.contracts as any;
    const providerProfile = contract?.profiles;
    const stripeAccountId = providerProfile?.stripe_account_id;
    const onboardingComplete = providerProfile?.stripe_onboarding_complete;

    if (!stripeAccountId || !onboardingComplete) {
      return res.status(400).json({ 
        error: "Provider has not completed Stripe onboarding" 
      });
    }

    const chargeAmount = charge.amount;
    const platformFee = chargeAmount * 0.02; // 2% platform fee
    const processingFee = (chargeAmount + platformFee) * 0.029 + 0.30; // Stripe processing fee
    const totalAmount = chargeAmount + platformFee + processingFee;

    // Calculate application fee (BlueTika's commission)
    const applicationFeeAmount = Math.round(platformFee * 100); // Convert to cents

    // Create Stripe Payment Intent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "nzd",
      application_fee_amount: applicationFeeAmount, // BlueTika's commission
      transfer_data: {
        destination: stripeAccountId, // Provider's connected account
      },
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        additional_charge_id: chargeId,
        charge_amount: chargeAmount.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        processing_fee: processingFee.toFixed(2),
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    res.status(500).json({ 
      error: "Failed to create payment intent",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}