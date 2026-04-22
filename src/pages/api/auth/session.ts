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

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionData = cookies["sb-session"];

    if (!sessionData) {
      return res.status(200).json({ session: null, user: null });
    }

    const session = JSON.parse(sessionData);

    // Create a server-side Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Set the session
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Clear invalid cookie
      const clearCookie = cookie.serialize("sb-session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
      res.setHeader("Set-Cookie", clearCookie);
      return res.status(200).json({ session: null, user: null });
    }

    return res.status(200).json({
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
      },
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return res.status(200).json({ session: null, user: null });
  }
}