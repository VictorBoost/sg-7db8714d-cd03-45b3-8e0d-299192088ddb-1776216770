/**
 * Amazon SES Email Service
 * Sends transactional emails via Amazon SES
 */

const SES_API_ENDPOINT = process.env.NEXT_PUBLIC_SES_ENDPOINT || "";
const FROM_EMAIL = "noreply@bluetika.co.nz";

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send email via Amazon SES
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!SES_API_ENDPOINT) {
    console.warn("SES_API_ENDPOINT not configured, skipping email send");
    return false;
  }

  try {
    const response = await fetch(SES_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        htmlBody: params.htmlBody,
        textBody: params.textBody || stripHtml(params.htmlBody)
      })
    });

    if (!response.ok) {
      console.error("SES email failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending SES email:", error);
    return false;
  }
}

/**
 * Send evidence photo reminder email
 */
export async function sendEvidencePhotoReminder(
  recipientEmail: string,
  recipientName: string,
  contractId: string,
  photoType: "before" | "after",
  projectTitle: string
): Promise<boolean> {
  const subject = `BlueTika: ${photoType === "before" ? "Before" : "After"} Photos Required`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1B4FD8; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; background: #06B6D4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Evidence Photos Required</h1>
        </div>
        <div class="content">
          <p>Kia ora ${recipientName},</p>
          
          <p>This is a reminder to upload your <strong>${photoType} photos</strong> for the project:</p>
          
          <p><strong>${projectTitle}</strong></p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Both parties must upload and confirm their ${photoType} photos. These photos are permanently locked once confirmed and serve as evidence for guarantee and dispute purposes.
          </div>
          
          <p>Please upload your photos as soon as possible:</p>
          
          <a href="https://bluetika.co.nz/contracts" class="button">Upload Photos Now</a>
          
          <p><strong>What you need to do:</strong></p>
          <ol>
            <li>Upload your ${photoType} photos</li>
            <li>Review and make any changes needed</li>
            <li>Click "Confirm" to lock them permanently</li>
          </ol>
          
          <p>Once both parties have confirmed their ${photoType} photos, ${photoType === "before" ? "work can proceed" : "the contract can be completed"}.</p>
          
          <p>Ngā mihi,<br>The BlueTika Team</p>
        </div>
        <div class="footer">
          <p>100% NZ Owned · Kiwis Helping Kiwis · bluetika.co.nz</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    htmlBody
  });
}

/**
 * Send review reminder email
 */
export async function sendReviewReminder(
  recipientEmail: string,
  recipientName: string,
  contractId: string,
  projectTitle: string,
  otherPartyName: string,
  recipientRole: "client" | "provider"
): Promise<boolean> {
  const subject = "BlueTika: Share Your Experience 🌟";

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1B4FD8; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; background: #06B6D4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .highlight { background: #E0F2FE; border-left: 4px solid #06B6D4; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>We'd Love to Hear From You!</h1>
        </div>
        <div class="content">
          <p>Kia ora ${recipientName},</p>
          
          <p>We hope your recent project went well! Your feedback helps build trust in our BlueTika community.</p>
          
          <p><strong>Project:</strong> ${projectTitle}</p>
          
          <div class="highlight">
            <p><strong>✨ Your review matters!</strong></p>
            <p>By sharing your experience working with ${otherPartyName}, you're helping other Kiwis make informed decisions. It only takes a minute!</p>
          </div>
          
          <p>What we'd love to know:</p>
          <ul>
            <li>How would you rate your overall experience? (1-5 stars)</li>
            <li>What went well?</li>
            <li>Any other feedback to share?</li>
          </ul>
          
          <a href="https://bluetika.co.nz/contracts" class="button">Submit Your Review</a>
          
          <p><em>Once both reviews are submitted, we'll process the final payment release.</em></p>
          
          <p>Thanks for being part of the BlueTika community!</p>
          
          <p>Ngā mihi,<br>The BlueTika Team</p>
        </div>
        <div class="footer">
          <p>100% NZ Owned · Kiwis Helping Kiwis · bluetika.co.nz</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    htmlBody
  });
}

/**
 * Send admin notification when both reviews are submitted and funds are ready for release
 */
export async function sendAdminFundReleaseNotification(
  contractId: string,
  projectTitle: string
): Promise<boolean> {
  const adminEmail = "admin@bluetika.co.nz"; // Update with actual admin email
  const subject = `BlueTika Admin: Funds Ready for Release - Contract ${contractId}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; background: #1B4FD8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; border: 1px solid #E5E7EB; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Reviews Completed</h1>
        </div>
        <div class="content">
          <p><strong>Action Required:</strong> Both parties have submitted their reviews. Contract is ready for fund release approval.</p>
          
          <div class="info-box">
            <p><strong>Contract ID:</strong> ${contractId}</p>
            <p><strong>Project:</strong> ${projectTitle}</p>
            <p><strong>Status:</strong> Awaiting Fund Release</p>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Review both submitted reviews</li>
            <li>Verify all contract requirements are met</li>
            <li>Approve and release funds to service provider</li>
          </ol>
          
          <a href="https://bluetika.co.nz/contracts" class="button">Review Contract</a>
          
          <p>This is an automated notification from the BlueTika platform.</p>
        </div>
        <div class="footer">
          <p>BlueTika Admin System · bluetika.co.nz</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    htmlBody
  });
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}