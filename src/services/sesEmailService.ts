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
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}