import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { sesEmailService } from "@/services/sesEmailService";
import { emailLogService } from "@/services/emailLogService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, fullName, userType } = req.body;

  if (!email || !password || !fullName || !userType) {
    return res.status(400).json({ 
      error: "Email, password, full name, and user type are required" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      error: "Password must be at least 6 characters long" 
    });
  }

  if (!["client", "provider", "both"].includes(userType)) {
    return res.status(400).json({ 
      error: "Invalid user type. Must be 'client', 'provider', or 'both'" 
    });
  }

  try {
    // Create server-side Supabase client
    const supabaseServer = createServerSupabaseClient({ req, res });

    // Create user account
    const { data: authData, error: authError } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"}/auth/verify`,
      },
    });

    if (authError) {
      console.error("Registration auth error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: "Failed to create user account" });
    }

    // Update profile with user type
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        user_type: userType,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail registration if profile update fails
    }

    // Send welcome email
    const emailSent = await sesEmailService.sendWelcomeEmail(
      email,
      fullName,
      process.env.NEXT_PUBLIC_BASE_URL || "https://bluetika.co.nz"
    );

    // Log email attempt
    if (emailSent) {
      await emailLogService.logEmail({
        recipient_email: email,
        email_type: "welcome",
        status: "sent",
        metadata: { user_id: authData.user.id }
      });
    } else {
      await emailLogService.logEmail({
        recipient_email: email,
        email_type: "welcome",
        status: "failed",
        error_message: "SES email service unavailable",
        metadata: { user_id: authData.user.id }
      });
    }

    // Set httpOnly cookie with session
    if (authData.session) {
      res.setHeader(
        "Set-Cookie",
        `sb-access-token=${authData.session.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      );
    }

    res.status(201).json({
      user: authData.user,
      session: authData.session,
      message: "Registration successful! Check your email for verification.",
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      error: "Registration failed. Please try again or contact support." 
    });
  }
}