import type { NextApiRequest, NextApiResponse } from "next";
import { sesEmailService } from "@/services/sesEmailService";
import { emailLogService } from "@/services/emailLogService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, html, metadata } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  try {
    const emailSent = await sesEmailService.sendEmail({
      to,
      subject,
      htmlBody: html,
    });

    if (!emailSent) {
      await emailLogService.logEmail({
        recipient_email: to,
        email_type: "receipt",
        status: "failed",
        error_message: "SES email service unavailable",
        metadata: metadata || {}
      });

      return res.status(500).json({ 
        success: false, 
        error: "Email service unavailable. Please try again later." 
      });
    }

    await emailLogService.logEmail({
      recipient_email: to,
      email_type: "receipt",
      status: "sent",
      metadata: metadata || {}
    });
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Receipt email error:", error);
    
    await emailLogService.logEmail({
      recipient_email: to,
      email_type: "receipt",
      status: "failed",
      error_message: error.message,
      metadata: metadata || {}
    });

    res.status(500).json({ 
      success: false, 
      error: "Failed to send receipt email. Please contact support." 
    });
  }
}