import { supabase } from "@/integrations/supabase/client";

interface ReceiptData {
  contractId: string;
  transactionId: string;
  paymentDate: string;
  agreedPrice: number;
  platformFee: number;
  processingFee: number;
  totalAmount: number;
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  projectDate: string | null;
  clientName: string;
  clientEmail: string;
  providerName: string;
  providerEmail: string;
  providerStripeConnected: boolean;
  providerStripeSetupUrl?: string;
}

export const receiptService = {
  async generateReceipt(contractId: string, baseUrl?: string): Promise<ReceiptData | null> {
    const { data: contract, error } = await supabase
      .from("contracts")
      .select(`
        id,
        stripe_payment_intent_id,
        final_amount,
        platform_fee,
        payment_processing_fee,
        total_amount,
        created_at,
        projects (
          title,
          description,
          location,
          specific_date
        ),
        client:profiles!contracts_client_id_fkey (
          full_name,
          email
        ),
        provider:profiles!contracts_provider_id_fkey (
          full_name,
          email,
          stripe_account_id
        )
      `)
      .eq("id", contractId)
      .single();

    if (error || !contract) {
      console.error("Failed to generate receipt:", error);
      return null;
    }

    // Use provided baseUrl or detect from window, fallback to .co.nz
    const siteUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "https://bluetika.co.nz");
    const providerStripeSetupUrl = `${siteUrl}/account?stripe_setup=required`;

    return {
      contractId: contract.id,
      transactionId: contract.stripe_payment_intent_id || "N/A",
      paymentDate: new Date(contract.created_at).toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      agreedPrice: contract.final_amount,
      platformFee: contract.platform_fee || 0,
      processingFee: contract.payment_processing_fee || 0,
      totalAmount: contract.total_amount || contract.final_amount,
      projectTitle: contract.projects?.title || "Project",
      projectDescription: contract.projects?.description || "",
      projectLocation: contract.projects?.location || "",
      projectDate: contract.projects?.specific_date || null,
      clientName: contract.client?.full_name || "Client",
      clientEmail: contract.client?.email || "",
      providerName: contract.provider?.full_name || "Service Provider",
      providerEmail: contract.provider?.email || "",
      providerStripeConnected: !!contract.provider?.stripe_account_id,
      providerStripeSetupUrl,
    };
  },

  async sendClientReceipt(receipt: ReceiptData, baseUrl?: string) {
    const siteUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "https://bluetika.co.nz");
    const html = this.generateClientEmailTemplate(receipt, siteUrl);

    const response = await fetch("/api/send-receipt-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: receipt.clientEmail,
        subject: "Payment Confirmed - BlueTika",
        html,
      }),
    });

    return response.json();
  },

  async sendProviderReceipt(receipt: ReceiptData, baseUrl?: string) {
    const siteUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "https://bluetika.co.nz");
    const html = this.generateProviderEmailTemplate(receipt, siteUrl);

    const response = await fetch("/api/send-receipt-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: receipt.providerEmail,
        subject: receipt.providerStripeConnected 
          ? "Payment Received - BlueTika" 
          : "Payment Received - Action Required - BlueTika",
        html,
      }),
    });

    return response.json();
  },

  generateClientEmailTemplate(receipt: ReceiptData, baseUrl: string): string {
    const scheduledDate = receipt.projectDate 
      ? new Date(receipt.projectDate).toLocaleDateString("en-NZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "To be arranged";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - BlueTika</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #1B4FD8 0%, #06B6D4 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">BlueTika</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">100% NZ Owned · Kiwis Helping Kiwis</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Success Badge -->
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 25px; font-weight: 600; font-size: 18px;">
        ✓ Payment Confirmed
      </div>
    </div>

    <h2 style="color: #1B4FD8; margin-top: 0; font-size: 24px; text-align: center;">Your Payment is Secure</h2>
    
    <div style="background: #EEF2FF; border-left: 4px solid #1B4FD8; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #1E293B;">
        <strong>🔒 Escrow Protection:</strong> Your payment of <strong>NZD $${receipt.totalAmount.toLocaleString()}</strong> is held securely by BlueTika. The funds will not be released to the service provider until the work is complete, evidence photos are submitted, and both parties have reviewed each other.
      </p>
    </div>

    <!-- Contract Details -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1E293B; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Contract Summary</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Project:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${receipt.projectTitle}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Service Provider:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${receipt.providerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Location:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${receipt.projectLocation}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Scheduled Date:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${scheduledDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Transaction ID:</td>
          <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #1E293B; font-size: 12px;">${receipt.transactionId}</td>
        </tr>
      </table>
    </div>

    <!-- Payment Breakdown -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1E293B; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Payment Breakdown</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Agreed price:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #1E293B; font-size: 14px;">NZD $${receipt.agreedPrice.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Platform fee (2%):</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #1E293B; font-size: 14px;">NZD $${receipt.platformFee.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">
            Payment processing contribution:
            <span style="display: inline-block; background: #EEF2FF; color: #1B4FD8; width: 16px; height: 16px; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 700; line-height: 16px; margin-left: 4px;">?</span>
          </td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #1E293B; font-size: 14px;">NZD $${receipt.processingFee.toLocaleString()}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 5px 15px; background: #F8FAFC; border-radius: 4px;">
            <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
              <strong>About payment processing:</strong> BlueTika uses Stripe for secure payments. 
              Domestic cards: 2.65% + $0.30. International cards: 3.7% + $0.30. 
              This small contribution keeps your payment protected.
            </p>
          </td>
        </tr>
        <tr style="border-top: 2px solid #E2E8F0;">
          <td style="padding: 15px 0 10px 0; color: #1E293B; font-size: 16px; font-weight: 700;">Total:</td>
          <td style="padding: 15px 0 10px 0; text-align: right; color: #10B981; font-size: 18px; font-weight: 700;">NZD $${receipt.totalAmount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <!-- Next Steps -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1E293B; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">What Happens Next?</h3>
      
      <div style="margin: 15px 0;">
        <div style="display: flex; margin-bottom: 15px;">
          <div style="background: #1B4FD8; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">1</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Work Begins</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">The service provider will complete the work as agreed. Stay in touch via the BlueTika platform.</p>
          </div>
        </div>

        <div style="display: flex; margin-bottom: 15px;">
          <div style="background: #1B4FD8; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">2</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Evidence Photos Required</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">Both parties must upload before and after photos. This protects everyone and helps resolve any disputes quickly.</p>
          </div>
        </div>

        <div style="display: flex; margin-bottom: 15px;">
          <div style="background: #1B4FD8; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">3</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Review Each Other</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">Leave a star rating and review for the service provider. Your feedback helps the community!</p>
          </div>
        </div>

        <div style="display: flex;">
          <div style="background: #10B981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">4</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Funds Released</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">After both parties complete reviews and no disputes are raised, BlueTika will release the funds to the service provider (typically 2-3 days after reviews).</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Safety Notice -->
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400E; font-size: 15px;">⚠️ Safety & Dispute Prevention</p>
      <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 14px;">
        <li style="margin-bottom: 8px;">Always communicate through the BlueTika platform</li>
        <li style="margin-bottom: 8px;">Take photos before work starts and after completion</li>
        <li style="margin-bottom: 8px;">If you're unhappy with the work, contact us before leaving a review</li>
        <li style="margin-bottom: 0;">Never make additional payments outside the platform</li>
      </ul>
    </div>

    <!-- Terms Reminder -->
    <div style="margin: 25px 0; padding: 15px; background: #F8FAFC; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.6;">
        By using BlueTika, you agree to our <a href="${baseUrl}/terms" style="color: #1B4FD8; text-decoration: none;">Terms & Conditions</a>. 
        Your payment is protected under our escrow system. Funds are only released after work completion, photo submission, and mutual reviews. 
        If a dispute arises, BlueTika will mediate fairly.
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}/contracts" style="display: inline-block; background: #1B4FD8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Contract Details</a>
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 30px 20px; color: #64748B; font-size: 13px;">
    <p style="margin: 0 0 10px 0;">Questions? Contact us at <a href="mailto:support@bluetika.co.nz" style="color: #1B4FD8; text-decoration: none;">support@bluetika.co.nz</a></p>
    <p style="margin: 0 0 10px 0;">100% NZ Owned · Kiwis Helping Kiwis</p>
    <p style="margin: 0;"><a href="${baseUrl}" style="color: #1B4FD8; text-decoration: none;">${baseUrl.replace('https://', '')}</a></p>
  </div>
</body>
</html>
    `.trim();
  },

  generateProviderEmailTemplate(receipt: ReceiptData, baseUrl: string): string {
    const scheduledDate = receipt.projectDate 
      ? new Date(receipt.projectDate).toLocaleDateString("en-NZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "To be arranged";

    const stripeSetupSection = !receipt.providerStripeConnected ? `
    <!-- Stripe Setup Required -->
    <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <p style="margin: 0 0 15px 0; font-weight: 700; color: #991B1B; font-size: 16px;">⚠️ Action Required: Set Up Your Stripe Account</p>
      <p style="margin: 0 0 15px 0; color: #991B1B; font-size: 14px; line-height: 1.6;">
        You need to connect your Stripe account to receive payments. This is a one-time setup that takes about 5 minutes.
      </p>
      <div style="text-align: center;">
        <a href="${receipt.providerStripeSetupUrl}" style="display: inline-block; background: #DC2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Set Up Stripe Account Now</a>
      </div>
      <p style="margin: 15px 0 0 0; color: #991B1B; font-size: 12px; text-align: center;">
        Without Stripe setup, you cannot receive your earnings. Complete this step before starting work.
      </p>
    </div>
    ` : `
    <!-- Stripe Connected -->
    <div style="background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #065F46;">
        <strong>✓ Your Stripe account is connected.</strong> After the work is complete and reviewed, funds will be transferred to your account within 2-3 business days of release.
      </p>
    </div>
    `;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received - BlueTika</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">BlueTika</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">100% NZ Owned · Kiwis Helping Kiwis</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Success Badge -->
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 25px; font-weight: 600; font-size: 18px;">
        🎉 Congratulations!!
      </div>
    </div>

    <h2 style="color: #10B981; margin-top: 0; font-size: 24px; text-align: center;">The Client Has Sent Payment</h2>
    
    <div style="background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #065F46;">
        <strong>✓ Payment confirmed by Stripe:</strong> <strong>NZD $${receipt.agreedPrice.toLocaleString()}</strong> is held securely in escrow. You can now begin work on this project!
      </p>
    </div>

    ${stripeSetupSection}

    <!-- Contract Details -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1E293B; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Contract Summary</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Project:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${receipt.projectTitle}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Client:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${receipt.clientName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Location:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${receipt.projectLocation}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Scheduled Date:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E293B; font-size: 14px;">${scheduledDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Project Description:</td>
          <td style="padding: 10px 0; text-align: right; color: #1E293B; font-size: 14px;">${receipt.projectDescription.substring(0, 100)}${receipt.projectDescription.length > 100 ? '...' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Transaction ID:</td>
          <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #1E293B; font-size: 12px;">${receipt.transactionId}</td>
        </tr>
      </table>
    </div>

    <!-- Earnings Breakdown -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1E293B; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Your Earnings</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #64748B; font-size: 14px;">Project Payment:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #1E293B; font-size: 14px;">NZD $${receipt.agreedPrice.toLocaleString()}</td>
        </tr>
        <tr style="border-top: 2px solid #E2E8F0;">
          <td style="padding: 15px 0 5px 0; color: #64748B; font-size: 12px;" colspan="2">
            <em>Commission will be deducted based on your tier level when funds are released</em>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #1E293B; font-size: 16px; font-weight: 700;">Held in Escrow:</td>
          <td style="padding: 10px 0; text-align: right; color: #10B981; font-size: 18px; font-weight: 700;">NZD $${receipt.agreedPrice.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <!-- Next Steps for Provider -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1E293B; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Your Next Steps</h3>
      
      <div style="margin: 15px 0;">
        <div style="display: flex; margin-bottom: 15px;">
          <div style="background: #10B981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">1</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Complete the Work</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">Deliver high-quality work as agreed. Stay in communication with the client via BlueTika.</p>
          </div>
        </div>

        <div style="display: flex; margin-bottom: 15px;">
          <div style="background: #10B981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">2</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Upload Evidence Photos (REQUIRED)</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;"><strong>Take before and after photos.</strong> This protects you from disputes and proves work was completed to standard.</p>
          </div>
        </div>

        <div style="display: flex; margin-bottom: 15px;">
          <div style="background: #10B981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">3</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Review the Client</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">Leave a star rating and honest review. This helps build your reputation and assists other providers.</p>
          </div>
        </div>

        <div style="display: flex;">
          <div style="background: #06B6D4; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">4</div>
          <div>
            <strong style="color: #1E293B; font-size: 15px;">Receive Your Payment</strong>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 14px;">BlueTika will release funds after both reviews are complete and no disputes raised (typically 2-3 days). Payment arrives in your bank within 2-3 business days.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Safety Notice -->
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400E; font-size: 15px;">⚠️ Safety & Dispute Prevention</p>
      <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 14px;">
        <li style="margin-bottom: 8px;">Always communicate through BlueTika - never via personal email/phone</li>
        <li style="margin-bottom: 8px;">Upload before/after photos BEFORE marking work complete</li>
        <li style="margin-bottom: 8px;">If the client requests changes, discuss and document via the platform</li>
        <li style="margin-bottom: 0;">Never request additional payments outside the platform</li>
      </ul>
    </div>

    <!-- Terms Reminder -->
    <div style="margin: 25px 0; padding: 15px; background: #F8FAFC; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.6;">
        By accepting this contract, you agree to BlueTika's <a href="${baseUrl}/terms" style="color: #1B4FD8; text-decoration: none;">Terms & Conditions</a>. 
        Payment is held in escrow until work completion, photo submission, and mutual reviews. BlueTika commission is calculated based on your tier level.
        Complete all steps to ensure smooth payment release.
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}/contracts" style="display: inline-block; background: #10B981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Contract & Upload Photos</a>
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 30px 20px; color: #64748B; font-size: 13px;">
    <p style="margin: 0 0 10px 0;">Questions? Contact us at <a href="mailto:support@bluetika.co.nz" style="color: #1B4FD8; text-decoration: none;">support@bluetika.co.nz</a></p>
    <p style="margin: 0 0 10px 0;">100% NZ Owned · Kiwis Helping Kiwis</p>
    <p style="margin: 0;"><a href="${baseUrl}" style="color: #1B4FD8; text-decoration: none;">${baseUrl.replace('https://', '')}</a></p>
  </div>
</body>
</html>
    `.trim();
  },
};