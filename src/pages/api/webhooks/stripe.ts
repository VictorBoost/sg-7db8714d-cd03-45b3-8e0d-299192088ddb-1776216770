import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";
import { sesEmailService } from "@/services/sesEmailService";
import { emailLogService } from "@/services/emailLogService";
import { receiptService } from "@/services/receiptService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_MARKETPLACE || "";

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
    console.error("STRIPE_WEBHOOK_SECRET_MARKETPLACE not configured");
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
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const contractId = paymentIntent.metadata.contractId;
        const isAdditionalCharge = paymentIntent.metadata.additional_charge_id;

        if (isAdditionalCharge) {
          // Handle additional charge payment
          const { data: charge, error: chargeError } = await supabase
            .from("additional_charges")
            .update({ 
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", isAdditionalCharge)
            .select(`
              *,
              contract:contracts(
                project:projects(title, client:profiles!projects_client_id_fkey(email, full_name)),
                provider:profiles!contracts_provider_id_fkey(email, full_name)
              )
            `)
            .single();

          if (chargeError) {
            console.error("Error updating additional charge:", chargeError);
          } else {
            console.log(`Additional charge ${isAdditionalCharge} marked as paid`);

            // Send payment confirmation emails to both parties
            if (charge.contract?.provider) {
              const providerEmailSent = await sesEmailService.sendEmail({
                to: charge.contract.provider.email,
                subject: "BlueTika: Additional Charge Payment Received 💰",
                htmlBody: `
                  <h2>Payment Received</h2>
                  <p>Kia ora ${charge.contract.provider.full_name || "Provider"},</p>
                  <p>The additional charge of <strong>NZD $${charge.amount}</strong> for <strong>${charge.contract.project?.title}</strong> has been paid.</p>
                  <p>Funds will be released after project completion and reviews.</p>
                `
              });

              await emailLogService.logEmail({
                recipient_email: charge.contract.provider.email,
                email_type: "additional_charge_paid_provider",
                status: providerEmailSent ? "sent" : "failed",
                metadata: { charge_id: isAdditionalCharge, payment_intent_id: paymentIntent.id }
              });
            }

            if (charge.contract?.project?.client) {
              const clientEmailSent = await sesEmailService.sendEmail({
                to: charge.contract.project.client.email,
                subject: "BlueTika: Additional Charge Payment Confirmed",
                htmlBody: `
                  <h2>Payment Confirmed</h2>
                  <p>Kia ora ${charge.contract.project.client.full_name || "Client"},</p>
                  <p>Your payment of <strong>NZD $${charge.amount}</strong> for the additional charge has been processed.</p>
                  <p><strong>Project:</strong> ${charge.contract.project.title}</p>
                `
              });

              await emailLogService.logEmail({
                recipient_email: charge.contract.project.client.email,
                email_type: "additional_charge_paid_client",
                status: clientEmailSent ? "sent" : "failed",
                metadata: { charge_id: isAdditionalCharge, payment_intent_id: paymentIntent.id }
              });
            }
          }
        } else if (contractId) {
          // Handle main contract payment
          const { data: contract, error: contractError } = await supabase
            .from("contracts")
            .update({ 
              payment_status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", contractId)
            .select(`
              *,
              project:projects(title, client:profiles!projects_client_id_fkey(email, full_name)),
              provider:profiles!contracts_provider_id_fkey(email, full_name, stripe_account_id)
            `)
            .single();

          if (contractError) {
            console.error("Error updating contract payment:", contractError);
          } else {
            console.log(`Contract ${contractId} payment marked as paid`);

            // Send payment confirmation emails to BOTH parties
            if (contract.provider) {
              const providerEmailSent = await sesEmailService.sendEmail({
                to: contract.provider.email,
                subject: "BlueTika: Payment Received - Start Work! 🎉",
                htmlBody: `
                  <h2>Payment Confirmed!</h2>
                  <p>Kia ora ${contract.provider.full_name || "Provider"},</p>
                  <p>The client has paid <strong>NZD $${contract.agreed_price}</strong> for <strong>${contract.project?.title}</strong>.</p>
                  <p><strong>Next Steps:</strong></p>
                  <ul>
                    <li>Upload "before" evidence photos</li>
                    <li>Complete the work as agreed</li>
                    <li>Upload "after" evidence photos</li>
                    <li>Await client review for fund release</li>
                  </ul>
                  <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/contracts">View Contract</a></p>
                `
              });

              await emailLogService.logEmail({
                recipient_email: contract.provider.email,
                email_type: "payment_confirmed_provider",
                status: providerEmailSent ? "sent" : "failed",
                metadata: { contract_id: contractId, payment_intent_id: paymentIntent.id }
              });
            }

            if (contract.project?.client) {
              const clientEmailSent = await sesEmailService.sendEmail({
                to: contract.project.client.email,
                subject: "BlueTika: Payment Confirmed - Service Provider Notified",
                htmlBody: `
                  <h2>Payment Successful</h2>
                  <p>Kia ora ${contract.project.client.full_name || "Client"},</p>
                  <p>Your payment of <strong>NZD $${contract.agreed_price}</strong> has been received and secured.</p>
                  <p><strong>Project:</strong> ${contract.project.title}</p>
                  <p>The service provider has been notified and will begin work shortly. You can track progress in your contracts dashboard.</p>
                  <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/contracts">Track Progress</a></p>
                `
              });

              await emailLogService.logEmail({
                recipient_email: contract.project.client.email,
                email_type: "payment_confirmed_client",
                status: clientEmailSent ? "sent" : "failed",
                metadata: { contract_id: contractId, payment_intent_id: paymentIntent.id }
              });

              // Generate and send receipt
              try {
                const receiptHtml = await receiptService.generatePaymentReceipt(contractId);
                if (receiptHtml) {
                  await receiptService.sendReceiptEmail(
                    contract.project.client.email,
                    contract.project.client.full_name || "Client",
                    receiptHtml
                  );
                }
              } catch (receiptError) {
                console.error("Failed to send receipt:", receiptError);
              }
            }
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        
        const isComplete = account.details_submitted && 
                          account.charges_enabled && 
                          account.payouts_enabled;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_account_status: isComplete ? "active" : "pending",
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
        } else {
          console.log(`Updated Stripe status for account ${account.id}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription ${event.type}: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription deleted: ${subscription.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice payment failed: ${invoice.id}`);
        break;
      }

      case "account.application.deauthorized": {
        const application = event.data.object as any;
        const accountId = application.id || application.account;
        
        if (accountId) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              stripe_account_id: null,
              stripe_account_status: "not_connected"
            })
            .eq("stripe_account_id", accountId);

          if (updateError) {
            console.error("Error disconnecting account:", updateError);
          } else {
            console.log(`Disconnected account ${accountId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed. Please contact support." });
  }
}