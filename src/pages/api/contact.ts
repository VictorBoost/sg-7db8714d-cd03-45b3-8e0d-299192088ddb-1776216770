import type { NextApiRequest, NextApiResponse } from "next";
import { sesEmailService } from "@/services/sesEmailService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, phone, subject, message, domain } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Send notification to admin
    const adminEmail = "support@bluetika.co.nz";
    
    const adminHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B4FD8;">New Contact Form Submission</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Submission Details</h3>
          <p><strong>Domain Source:</strong> ${domain || 'Unknown'}</p>
          <p><strong>Sender Email:</strong> ${email}</p>
          <p><strong>Sender Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
        </div>

        <div style="background: white; padding: 20px; border-left: 4px solid #1B4FD8; margin: 20px 0;">
          <h3 style="margin-top: 0;">Message</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Reply directly to:</strong> ${email}<br>
            <strong>Form submitted from:</strong> ${domain}
          </p>
        </div>
      </div>
    `;

    await sesEmailService.sendEmail({
      to: adminEmail,
      subject: `Contact Form: ${subject || 'New Message'} from ${domain}`,
      htmlBody: adminHtmlBody,
    });

    // Send confirmation to user
    const userHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B4FD8;">Thank You for Contacting BlueTika</h2>
        
        <p>Hi ${name},</p>
        
        <p>We've received your message and will get back to you within 24 hours.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Message</h3>
          <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>

        <p>If you need immediate assistance, please call us at <strong>0800 BLUETIKA</strong></p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          <p>Best regards,<br>
          The BlueTika Team<br>
          support@bluetika.co.nz</p>
        </div>
      </div>
    `;

    await sesEmailService.sendEmail({
      to: email,
      subject: "BlueTika: We've received your message",
      htmlBody: userHtmlBody,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Contact form error:", error);
    return res.status(500).json({ error: error.message });
  }
}