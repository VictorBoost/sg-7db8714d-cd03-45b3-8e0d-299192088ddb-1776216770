import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { sesEmailService } from "@/services/sesEmailService";

/**
 * SEPARATE ADMIN LOGIN ENDPOINT
 * Uses different session cookie to isolate admin access
 */
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
    // Create server-side Supabase client
    const supabaseServer = createServerSupabaseClient({ req, res });

    // Sign in with email and password
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Admin login error:", error);
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    if (!data.user) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin, full_name")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.error("Admin verification failed:", profileError);
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    // Send admin login alert email
    await sesEmailService.sendEmail({
      to: "admin@bluetika.co.nz",
      subject: "BlueTika Admin Login Alert",
      htmlBody: `
        <h2>Admin Login Detected</h2>
        <p><strong>User:</strong> ${profile.full_name} (${email})</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>IP:</strong> ${req.headers["x-forwarded-for"] || req.socket.remoteAddress}</p>
      `
    });

    // Set SEPARATE admin session cookie (different name)
    res.setHeader(
      "Set-Cookie",
      `muna-access-token=${data.session?.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/muna; Max-Age=3600`
    );

    res.status(200).json({
      user: data.user,
      session: data.session,
      isAdmin: true,
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Admin authentication failed. Please try again." });
  }
}