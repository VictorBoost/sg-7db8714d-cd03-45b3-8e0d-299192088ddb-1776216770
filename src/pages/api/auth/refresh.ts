import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import cookie from "cookie";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionData = cookies["sb-session"];

    if (!sessionData) {
      return res.status(401).json({ error: "No session found" });
    }

    const session = JSON.parse(sessionData);

    // Create a server-side Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (error || !data.session) {
      // Clear invalid cookie
      const clearCookie = cookie.serialize("sb-session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
      res.setHeader("Set-Cookie", clearCookie);
      return res.status(401).json({ error: "Session refresh failed" });
    }

    // Update the cookie with new tokens
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

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at,
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}