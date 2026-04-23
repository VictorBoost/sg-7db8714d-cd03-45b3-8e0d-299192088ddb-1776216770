import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: providerBots } = await supabaseClient
      .from("bot_accounts")
      .select("profile_id, profiles!inner(full_name, city_region)")
      .eq("bot_type", "provider")
      .eq("is_active", true);

    if (!providerBots || providerBots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active provider bots" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: openProjects } = await supabaseClient
      .from("projects")
      .select("id, title, budget, client_id")
      .eq("status", "open")
      .limit(100);

    if (!openProjects || openProjects.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No open projects found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bidMessages = [
      "Hi there! I've done similar work in the area and would love to help. I'm available this week and can start ASAP. Let me know if you'd like to discuss details. Cheers!",
      "Hey, this sounds right up my alley. I've got {years} years experience and can definitely get this sorted for you. Free to chat anytime if you want to go over specifics.",
      "G'day! Keen to quote on this job. I'm local to {city} so can come have a look whenever suits. No obligation, happy to give you a fair price.",
      "Hi! I'd be interested in this one. I've done heaps of these jobs and can guarantee quality work. Available to start next week if that works for you?",
      "Hey mate, reckon I can help you out with this. I'm pretty flexible with timing and my rates are competitive. Drop me a message if you want to chat about it.",
      "Hello! This is exactly the kind of work I specialize in. I'm based in {city} and can come by for a free quote. All work guaranteed, references available.",
      "Hi, I'd love to take this on. Got all the gear and experience needed. Can work around your schedule too. Let me know if you'd like to discuss!",
      "G'day! Happy to give you a hand with this. I'm reliable, tidy, and won't leave you with a mess. Been doing this for years. Keen to hear from you."
    ];

    const results = { created: 0, errors: [] as string[] };

    for (const bot of providerBots) {
      const numBids = Math.floor(Math.random() * 2) + 1;
      const shuffled = [...openProjects].sort(() => Math.random() - 0.5);
      const projectsToBeOn = shuffled.slice(0, numBids);

      for (const project of projectsToBeOn) {
        try {
          const { data: existing } = await supabaseClient
            .from("bids")
            .select("id")
            .eq("project_id", project.id)
            .eq("provider_id", bot.profile_id)
            .maybeSingle();

          if (existing) continue;

          const baseAmount = project.budget || 200;
          const variation = Math.random() * 0.3 - 0.15;
          const bidAmount = Math.max(50, Math.round(baseAmount * (1 + variation)));

          const years = Math.floor(Math.random() * 10) + 3;
          const city = (bot.profiles as any)?.city_region || "Auckland";
          const message = bidMessages[Math.floor(Math.random() * bidMessages.length)]
            .replace("{years}", years.toString())
            .replace("{city}", city);

          const { error: bidError } = await supabaseClient
            .from("bids")
            .insert({
              project_id: project.id,
              provider_id: bot.profile_id,
              amount: bidAmount,
              message,
              status: "pending"
            });

          if (bidError) {
            results.errors.push(`Bid creation failed: ${bidError.message}`);
            continue;
          }

          await supabaseClient
            .from("bot_activity_logs")
            .insert({
              bot_id: bot.profile_id,
              action_type: "submit_bid",
              details: { project_id: project.id, amount: bidAmount }
            });

          results.created++;
        } catch (err: any) {
          results.errors.push(`Error: ${err.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, created: results.created, errors: results.errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});