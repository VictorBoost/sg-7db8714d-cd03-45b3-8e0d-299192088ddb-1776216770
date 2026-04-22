import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import cookie from "cookie";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.redirect(302, "/login?error=oauth_failed");
  }

  try {
    // Create a server-side Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error("OAuth callback error:", error);
      return res.redirect(302, "/login?error=oauth_failed");
    }

    // Set httpOnly cookie with the session tokens
    const sessionCookie = cookie.serialize("sb-session", JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 28800, // 8 hours
      path: "/",
    });

    res.setHeader("Set-Cookie", sessionCookie);

    // Redirect to home page
    return res.redirect(302, "/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return res.redirect(302, "/login?error=oauth_failed");
  }
}