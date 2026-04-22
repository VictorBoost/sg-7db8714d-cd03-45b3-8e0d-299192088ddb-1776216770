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
    const { amount, contractId, platformFee, paymentProcessingFee } = req.body;

    // Get contract details to fetch provider's Stripe account
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select(`
        provider_id,
        profiles!contracts_provider_id_fkey(stripe_account_id, stripe_onboarding_complete)
      `)
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    const providerProfile = contract.profiles as any;
    const stripeAccountId = providerProfile?.stripe_account_id;
    const onboardingComplete = providerProfile?.stripe_onboarding_complete;

    if (!stripeAccountId || !onboardingComplete) {
      return res.status(400).json({ 
        error: "Provider has not completed Stripe onboarding" 
      });
    }

    // Calculate application fee (BlueTika's commission)
    // platformFee is already calculated as percentage of contract amount
    const applicationFeeAmount = Math.round(platformFee * 100); // Convert to cents

    // Create payment intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Total amount in cents (contract + platform fee + processing fee)
      currency: "nzd",
      application_fee_amount: applicationFeeAmount, // BlueTika's commission
      transfer_data: {
        destination: stripeAccountId, // Provider's connected account
      },
      metadata: {
        contractId,
        platformFee: platformFee.toString(),
        paymentProcessingFee: paymentProcessingFee.toString(),
      },
      description: `BlueTika Contract ${contractId}`,
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Payment intent creation error:", error);
    res.status(500).json({ error: error.message });
  }
}