import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("⏰ HOURLY-BOT-CYCLE: Starting 24/7 automation cycle");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if automation is enabled
    const { data: automationSetting } = await supabaseClient
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "bot_automation_enabled")
      .single();

    if (automationSetting?.setting_value !== "true") {
      console.log("⏸️ HOURLY-BOT-CYCLE: Bot automation is disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Automation disabled", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🚀 HOURLY-BOT-CYCLE: Running full lifecycle automation");

    const results = {
      projects: 0,
      bids: 0,
      messages: 0,
      contracts: 0,
      completed: 0,
      errors: [] as string[]
    };

    // Step 1: Post Projects (3-5 random projects)
    console.log("\n📝 Step 1: Posting projects...");
    try {
      const projectCount = Math.floor(Math.random() * 3) + 3; // 3-5 projects
      
      const { data: clientBots } = await supabaseClient
        .from("bot_accounts")
        .select("profile_id, profiles!inner(full_name, city_region)")
        .eq("bot_type", "client")
        .eq("is_active", true)
        .limit(projectCount * 2);

      const { data: categories } = await supabaseClient
        .from("categories")
        .select("id, name, subcategories(id, name)")
        .eq("is_active", true);

      if (clientBots && categories) {
        const templates = [
          { title: "Need plumber for leaking tap", basePrice: 150 },
          { title: "Garden maintenance needed", basePrice: 200 },
          { title: "Help moving furniture", basePrice: 250 },
          { title: "House cleaning service", basePrice: 120 },
          { title: "Painting bedroom walls", basePrice: 400 },
          { title: "Lawn mowing service", basePrice: 80 },
          { title: "Handyman for odd jobs", basePrice: 180 }
        ];

        const locations = ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Dunedin"];

        for (let i = 0; i < Math.min(projectCount, clientBots.length); i++) {
          const bot = clientBots[i];
          const template = templates[Math.floor(Math.random() * templates.length)];
          const category = categories[Math.floor(Math.random() * categories.length)];
          
          const budget = Math.floor(template.basePrice * (0.6 + Math.random() * 0.4));

          const { error } = await supabaseClient
            .from("projects")
            .insert({
              title: template.title,
              description: "Looking for someone reliable. Can provide details if needed. Thanks!",
              category_id: category.id,
              budget,
              client_id: bot.profile_id,
              location: bot.profiles?.city_region || locations[Math.floor(Math.random() * locations.length)],
              status: "open"
            });

          if (!error) {
            results.projects++;
            await supabaseClient.from("bot_activity_logs").insert({
              bot_id: bot.profile_id,
              action_type: "post_project",
              details: { title: template.title }
            });
          } else {
            results.errors.push(`Project: ${error.message}`);
          }
        }
      }
      console.log(`✅ Posted ${results.projects} projects`);
    } catch (err: any) {
      console.error("❌ Project posting failed:", err);
      results.errors.push(`Projects: ${err.message}`);
    }

    // Step 2: Submit Bids (5-10 bids)
    console.log("\n💰 Step 2: Submitting bids...");
    try {
      const bidCount = Math.floor(Math.random() * 6) + 5; // 5-10 bids

      const { data: openProjects } = await supabaseClient
        .from("projects")
        .select("id, title, budget")
        .eq("status", "open")
        .limit(20);

      const { data: providerBots } = await supabaseClient
        .from("bot_accounts")
        .select("profile_id")
        .eq("bot_type", "provider")
        .eq("is_active", true)
        .limit(15);

      if (openProjects && providerBots) {
        for (let i = 0; i < Math.min(bidCount, openProjects.length); i++) {
          const project = openProjects[i];
          const provider = providerBots[Math.floor(Math.random() * providerBots.length)];

          const { data: existing } = await supabaseClient
            .from("bids")
            .select("id")
            .eq("project_id", project.id)
            .eq("provider_id", provider.profile_id)
            .maybeSingle();

          if (!existing) {
            const baseAmount = project.budget || 200;
            const bidAmount = Math.max(50, Math.round(baseAmount * (0.85 + Math.random() * 0.1)));

            const { error } = await supabaseClient
              .from("bids")
              .insert({
                project_id: project.id,
                provider_id: provider.profile_id,
                amount: bidAmount,
                message: "Hi! I can help with this. Available to start soon.",
                status: "pending"
              });

            if (!error) {
              results.bids++;
              await supabaseClient.from("bot_activity_logs").insert({
                bot_id: provider.profile_id,
                action_type: "submit_bid",
                details: { project_id: project.id, amount: bidAmount }
              });
            } else {
              results.errors.push(`Bid: ${error.message}`);
            }
          }
        }
      }
      console.log(`✅ Submitted ${results.bids} bids`);
    } catch (err: any) {
      console.error("❌ Bid submission failed:", err);
      results.errors.push(`Bids: ${err.message}`);
    }

    // Step 3: Send Messages (some with bypass attempts)
    console.log("\n💬 Step 3: Sending messages...");
    try {
      const { data: activeContracts } = await supabaseClient
        .from("contracts")
        .select("id, client_id, provider_id")
        .eq("status", "active")
        .limit(10);

      if (activeContracts) {
        const messages = [
          "When can you start?",
          "Do you need any materials?",
          "What time works best for you?",
          "My email is john@example.com if you need to reach me", // bypass attempt
          "Call me on 021-555-1234", // bypass attempt
          "Let's discuss on WhatsApp +64 21 555 6789", // bypass attempt
        ];

        const selectedContracts = activeContracts.slice(0, Math.min(5, activeContracts.length));

        for (const contract of selectedContracts) {
          const message = messages[Math.floor(Math.random() * messages.length)];
          const isClient = Math.random() > 0.5;

          const { error } = await supabaseClient
            .from("contract_messages")
            .insert({
              contract_id: contract.id,
              sender_id: isClient ? contract.client_id : contract.provider_id,
              receiver_id: isClient ? contract.provider_id : contract.client_id,
              message,
              contains_contact_info: message.includes("email") || message.includes("Call") || message.includes("WhatsApp")
            });

          if (!error) {
            results.messages++;
          }
        }
      }
      console.log(`✅ Sent ${results.messages} messages`);
    } catch (err: any) {
      console.error("❌ Message sending failed:", err);
      results.errors.push(`Messages: ${err.message}`);
    }

    // Step 4: Accept Bids (1-3 contracts)
    console.log("\n📋 Step 4: Accepting bids...");
    try {
      const acceptCount = Math.floor(Math.random() * 3) + 1; // 1-3

      const { data: projectsWithBids } = await supabaseClient
        .from("projects")
        .select(`
          id,
          client_id,
          bids!inner(id, provider_id, amount, status)
        `)
        .eq("status", "open")
        .eq("bids.status", "pending")
        .limit(acceptCount);

      if (projectsWithBids) {
        for (const project of projectsWithBids) {
          const { data: clientBot } = await supabaseClient
            .from("bot_accounts")
            .select("profile_id")
            .eq("profile_id", project.client_id)
            .maybeSingle();

          if (clientBot) {
            const bids = Array.isArray(project.bids) ? project.bids : [];
            if (bids.length > 0) {
              const winningBid = bids[Math.floor(Math.random() * bids.length)];

              await supabaseClient.from("bids").update({ status: "accepted" }).eq("id", winningBid.id);

              const otherBids = bids.filter(b => b.id !== winningBid.id);
              if (otherBids.length > 0) {
                await supabaseClient.from("bids").update({ status: "declined" }).in("id", otherBids.map(b => b.id));
              }

              const { error } = await supabaseClient
                .from("contracts")
                .insert({
                  project_id: project.id,
                  client_id: project.client_id,
                  provider_id: winningBid.provider_id,
                  bid_id: winningBid.id,
                  final_amount: winningBid.amount,
                  status: "active",
                  payment_status: "pending"
                });

              if (!error) {
                await supabaseClient.from("projects").update({ status: "assigned" }).eq("id", project.id);
                
                await supabaseClient.from("bot_activity_logs").insert({
                  bot_id: project.client_id,
                  action_type: "accept_bid",
                  details: { project_id: project.id, bid_id: winningBid.id }
                });
                
                results.contracts++;
              } else {
                results.errors.push(`Contract: ${error.message}`);
              }
            }
          }
        }
      }
      console.log(`✅ Created ${results.contracts} contracts`);
    } catch (err: any) {
      console.error("❌ Contract creation failed:", err);
      results.errors.push(`Contracts: ${err.message}`);
    }

    // Step 5: Complete Work (1-2 completions)
    console.log("\n✅ Step 5: Completing work...");
    try {
      const { data: activeContracts } = await supabaseClient
        .from("contracts")
        .select("id, final_amount, provider_id")
        .eq("status", "active")
        .is("work_done_at", null)
        .limit(2);

      if (activeContracts) {
        for (const contract of activeContracts) {
          // Upload evidence photos
          await supabaseClient.from("evidence_photos").insert([
            {
              contract_id: contract.id,
              photo_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
              uploaded_by: contract.provider_id,
              description: "Work completed - before"
            },
            {
              contract_id: contract.id,
              photo_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a",
              uploaded_by: contract.provider_id,
              description: "Work completed - after"
            }
          ]);

          // Mark work done
          const { error } = await supabaseClient
            .from("contracts")
            .update({
              work_done_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
              status: "awaiting_fund_release",
              ready_for_release_at: new Date(Date.now() - Math.random() * 1800000).toISOString()
            })
            .eq("id", contract.id);

          if (!error) {
            await supabaseClient.from("bot_activity_logs").insert({
              bot_id: contract.provider_id,
              action_type: "complete_work",
              details: { contract_id: contract.id }
            });
            results.completed++;
          } else {
            results.errors.push(`Work completion: ${error.message}`);
          }
        }
      }
      console.log(`✅ Completed ${results.completed} contracts`);
    } catch (err: any) {
      console.error("❌ Work completion failed:", err);
      results.errors.push(`Work: ${err.message}`);
    }

    // Update last run timestamp
    await supabaseClient
      .from("platform_settings")
      .update({ setting_value: new Date().toISOString() })
      .eq("setting_key", "bot_last_activity_run");

    console.log("\n📊 HOURLY-BOT-CYCLE COMPLETE");
    console.log(`   Projects: ${results.projects}`);
    console.log(`   Bids: ${results.bids}`);
    console.log(`   Messages: ${results.messages}`);
    console.log(`   Contracts: ${results.contracts}`);
    console.log(`   Completed: ${results.completed}`);
    if (results.errors.length > 0) {
      console.log(`   Errors: ${results.errors.length}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("💥 HOURLY-BOT-CYCLE: FATAL ERROR:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});