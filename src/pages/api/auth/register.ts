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

  const { email, password, firstName, lastName, phoneNumber, cityRegion, isClient, isProvider } = req.body;

  if (!email || !password || !firstName || !lastName || !phoneNumber || !cityRegion) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: "Registration failed" });
    }

    // Create profile with all metadata
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: email,
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        city_region: cityRegion,
        is_client: isClient || false,
        is_provider: isProvider || false,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Continue anyway - profile trigger might have created it
    }

    // Create session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });

    // Sign in the user to get a proper session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return res.status(400).json({ error: "Failed to create session" });
    }

    // Send welcome email (non-blocking)
    sesEmailService.sendWelcomeEmail(email, `${firstName} ${lastName}`, "https://bluetika.co.nz").catch(error => {
      console.error("Welcome email failed:", error);
    });

    // Set httpOnly cookie with session
    const sessionCookie = cookie.serialize("sb-session", signInData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 28800, // 8 hours
      path: "/",
    });

    res.setHeader("Set-Cookie", sessionCookie);

    return res.status(200).json({
      user: signInData.user,
      session: signInData.session,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}