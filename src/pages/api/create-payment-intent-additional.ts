import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
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

    // Get charge details
    const { data: charge, error: chargeError } = await supabase
      .from("additional_charges")
      .select("amount, status")
      .eq("id", chargeId)
      .single();

    if (chargeError || !charge) {
      return res.status(404).json({ error: "Charge not found" });
    }

    if (charge.status !== "approved") {
      return res.status(400).json({ error: "Charge is not approved" });
    }

    const chargeAmount = charge.amount;
    const platformFee = chargeAmount * 0.02;
    const processingFee = (chargeAmount + platformFee) * 0.029 + 0.30;
    const totalAmount = chargeAmount + platformFee + processingFee;

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "nzd",
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