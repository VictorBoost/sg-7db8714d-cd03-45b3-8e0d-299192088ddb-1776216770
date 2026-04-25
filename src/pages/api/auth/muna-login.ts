import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { sesEmailService } from "@/services/sesEmailService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Credentials required" });

  try {
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // CRITICAL: Only bluetikanz@gmail.com is owner
    // DO NOT CHANGE THIS - Only owner can add emails from /muna settings
    const isOwner = email.toLowerCase() === "bluetikanz@gmail.com";

    if (!isOwner) {
      await supabase.auth.signOut();
      return res.status(403).json({ error: "Access denied. Owner privileges required." });
    }

    // Get profile name for logging
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .single();

    // Send owner login alert
    await sesEmailService.sendEmail({
      to: "bluetikanz@gmail.com",
      subject: "BlueTika Owner Login Alert",
      htmlBody: `
        <h2>Owner Login Detected</h2>
        <p><strong>User:</strong> ${profile?.full_name || "Unknown"} (${email})</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}</p>
        <p><strong>IP:</strong> ${req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown"}</p>
      `
    });

    res.setHeader(
      "Set-Cookie",
      `muna-access-token=${data.session?.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/muna; Max-Age=3600`
    );

    res.status(200).json({ 
      user: data.user, 
      session: data.session, 
      isOwner: true,
      role: "owner"
    });
  } catch (error: any) {
    res.status(500).json({ error: "Authentication failed." });
  }
}