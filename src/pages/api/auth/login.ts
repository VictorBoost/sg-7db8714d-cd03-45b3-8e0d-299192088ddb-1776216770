import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Create server-side Supabase client with cookie handling
    const supabaseServer = createServerSupabaseClient({ req, res });

    // Sign in with email and password
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      return res.status(401).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set httpOnly cookie with session
    res.setHeader(
      "Set-Cookie",
      `sb-access-token=${data.session?.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
    );

    res.status(200).json({
      user: data.user,
      session: data.session,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Authentication failed. Please try again." });
  }
}