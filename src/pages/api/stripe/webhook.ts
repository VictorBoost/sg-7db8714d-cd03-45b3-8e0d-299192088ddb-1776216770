import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).json({ error: "No signature" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        
        // Check if account onboarding is complete
        const isComplete = account.details_submitted && 
                          account.charges_enabled && 
                          account.payouts_enabled;

        // Update profile with account status
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_onboarding_complete: isComplete,
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
        } else {
          console.log(`Updated Stripe status for account ${account.id}`);
        }
        break;
      }

      case "account.application.authorized": {
        const account = event.data.object as Stripe.Account;
        console.log(`Account authorized: ${account.id}`);
        break;
      }

      case "account.application.deauthorized": {
        const account = event.data.object as Stripe.Account;
        
        // Mark account as disconnected
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_account_id: null,
            stripe_onboarding_complete: false,
            stripe_charges_enabled: false,
            stripe_payouts_enabled: false,
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error disconnecting account:", updateError);
        } else {
          console.log(`Disconnected account ${account.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: error.message });
  }
}