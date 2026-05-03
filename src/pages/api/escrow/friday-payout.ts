import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { releaseCapturedEscrowToProvider } from "@/lib/serverEscrowRelease";
import { todayDateStringNz } from "@/lib/payoutScheduleNZ";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ processed: number; released: number; errors: string[] } | { error: string }>
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const nzToday = todayDateStringNz();

  const errors: string[] = [];
  let released = 0;

  const { data: rows, error: qErr } = await supabase
    .from("contracts")
    .select("id")
    .eq("payment_status", "held")
    .eq("stripe_payout_scheduled_for", nzToday)
    .eq("escrow_admin_hold", false);

  if (qErr) {
    return res.status(500).json({ error: qErr.message });
  }

  const ids = rows ?? [];

  for (const row of ids) {
    const result = await releaseCapturedEscrowToProvider(row.id, "scheduled_friday");
    if (!result.ok) {
      errors.push(`${row.id}: ${result.error}`);
    } else {
      released++;
    }
  }

  return res.status(200).json({
    processed: ids.length,
    released,
    errors,
  });
}
