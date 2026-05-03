import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if MonaLisa is active
    const { data: settings } = await supabase
      .from("monalisa_settings")
      .select("is_active")
      .single();

    if (!settings?.is_active) {
      return new Response(JSON.stringify({ message: "MonaLisa is deactivated" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const logs: any[] = [];

    // 1. Review Recent Posts
    const { data: recentPosts } = await supabase
      .from("projects")
      .select("id, title, description, client_id, created_at, status")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    for (const post of recentPosts || []) {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /\b(scam|fraud|fake|spam)\b/i,
        /\b(\d{10,})\b/, // Long numbers that might be phone/bank details
        /@\w+\.\w+/i, // Email patterns
      ];

      const isSuspicious = suspiciousPatterns.some(
        (pattern) => pattern.test(post.title) || pattern.test(post.description)
      );

      if (isSuspicious) {
        await supabase.from("monalisa_logs").insert({
          action_type: "post_review",
          severity: "warning",
          title: "Suspicious Post Detected",
          description: `Post "${post.title}" contains potentially suspicious content. Manual review recommended.`,
          related_project_id: post.id,
          related_user_id: post.client_id,
          metadata: { auto_detected: true, patterns_matched: true },
        });
        logs.push({ type: "post_review", post_id: post.id, flagged: true });
      }
    }

    // 2. Review Active Contracts
    const { data: activeContracts } = await supabase
      .from("contracts")
      .select("id, status, client_id, provider_id, created_at, work_done_at, after_photos_submitted_at")
      .in("status", ["active", "completed", "awaiting_fund_release"])
      .order("created_at", { ascending: false })
      .limit(50);

    for (const contract of activeContracts || []) {
      // Check for stalled contracts
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(contract.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (contract.status === "active" && daysSinceCreated > 30) {
        await supabase.from("monalisa_logs").insert({
          action_type: "contract_review",
          severity: "warning",
          title: "Stalled Contract Detected",
          description: `Contract has been active for ${daysSinceCreated} days. May need intervention.`,
          related_contract_id: contract.id,
          metadata: { days_active: daysSinceCreated },
        });
        logs.push({ type: "contract_review", contract_id: contract.id, days: daysSinceCreated });
      }

      // Check for stuck fund releases
      if (contract.status === "awaiting_fund_release" && daysSinceCreated > 14) {
        await supabase.from("monalisa_logs").insert({
          action_type: "contract_review",
          severity: "critical",
          title: "Delayed Fund Release",
          description: `Contract awaiting fund release for ${daysSinceCreated} days. Urgent action needed.`,
          related_contract_id: contract.id,
          metadata: { days_waiting: daysSinceCreated },
        });
      }
    }

    // 3. Check User Flags
    const { data: suspendedUsers } = await supabase
      .from("account_suspensions")
      .select("user_id, suspension_type, bypass_attempt_count, is_active")
      .eq("is_active", true)
      .gte("bypass_attempt_count", 3);

    for (const suspension of suspendedUsers || []) {
      await supabase.from("monalisa_logs").insert({
        action_type: "user_flag",
        severity: "critical",
        title: "High-Risk User Detected",
        description: `User has ${suspension.bypass_attempt_count} bypass attempts and is ${suspension.suspension_type}. Manual review recommended.`,
        related_user_id: suspension.user_id,
        metadata: { suspension_type: suspension.suspension_type, attempts: suspension.bypass_attempt_count },
      });
      logs.push({ type: "user_flag", user_id: suspension.user_id });
    }

    // 4. System Health Checks
    const systemChecks = [];

    // Check for unreviewed moderation queue items older than 48 hours
    const { count: pendingModeration } = await supabase
      .from("moderation_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (pendingModeration && pendingModeration > 0) {
      await supabase.from("monalisa_logs").insert({
        action_type: "system_health",
        severity: "warning",
        title: "Moderation Queue Backlog",
        description: `${pendingModeration} items pending moderation for over 48 hours.`,
        metadata: { pending_count: pendingModeration },
      });
      systemChecks.push({ type: "moderation_backlog", count: pendingModeration });
    }

    // Check for unresolved disputes older than 7 days
    const { count: oldDisputes } = await supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (oldDisputes && oldDisputes > 0) {
      await supabase.from("monalisa_logs").insert({
        action_type: "system_health",
        severity: "critical",
        title: "Unresolved Disputes",
        description: `${oldDisputes} disputes unresolved for over 7 days. Immediate attention needed.`,
        metadata: { dispute_count: oldDisputes },
      });
      systemChecks.push({ type: "old_disputes", count: oldDisputes });
    }

    // 5. Generate Suggestions
    const { data: providers } = await supabase
      .from("profiles")
      .select("id, full_name, verification_status, current_tier")
      .eq("is_provider", true)
      .eq("verification_status", "pending")
      .gte("verification_submitted_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (providers && providers.length > 5) {
      await supabase.from("monalisa_logs").insert({
        action_type: "suggestion",
        severity: "info",
        title: "Verification Bottleneck",
        description: `${providers.length} providers waiting for verification over 7 days. Consider increasing verification capacity.`,
        metadata: { pending_providers: providers.length },
      });
    }

    // Update last check timestamp
    await supabase
      .from("monalisa_settings")
      .update({ last_check_at: new Date().toISOString() })
      .eq("id", "00000000-0000-0000-0000-000000000000");

    return new Response(
      JSON.stringify({
        success: true,
        message: "MonaLisa check completed",
        summary: {
          posts_reviewed: recentPosts?.length || 0,
          contracts_reviewed: activeContracts?.length || 0,
          users_flagged: suspendedUsers?.length || 0,
          system_checks: systemChecks.length,
          logs_created: logs.length,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("MonaLisa error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});