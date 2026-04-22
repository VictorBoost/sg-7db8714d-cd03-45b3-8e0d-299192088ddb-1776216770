import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import cookie from "cookie";
import { sesEmailService } from "@/services/sesEmailService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user || !authData.session) {
      return res.status(400).json({ error: "Registration failed" });
    }

    // Send welcome email
    try {
      await sesEmailService.sendWelcomeEmail(email, fullName, "https://bluetika.co.nz");
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
      // Don't fail registration if email fails
    }

    // Set httpOnly cookie with session
    const sessionCookie = cookie.serialize("sb-session", authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 28800, // 8 hours
      path: "/",
    });

    res.setHeader("Set-Cookie", sessionCookie);

    return res.status(200).json({
      user: authData.user,
      session: authData.session,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}