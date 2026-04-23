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

    const { data: clientBots } = await supabaseClient
      .from("bot_accounts")
      .select("profile_id, profiles!inner(full_name, city_region)")
      .eq("bot_type", "client")
      .eq("is_active", true);

    if (!clientBots || clientBots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active client bots found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: categories } = await supabaseClient
      .from("categories")
      .select(`id, name, subcategories(id, name)`);

    if (!categories || categories.length === 0) {
      throw new Error("No categories found");
    }

    // More human-like, realistic project templates
    const projectTemplates = [
      {
        category: "Home Maintenance",
        projects: [
          {
            title: "Kitchen tap dripping - need plumber asap",
            description: "Hey, my kitchen tap has been dripping for about 2 weeks now and it's driving me nuts! Tried tightening it myself but no luck. Would really appreciate someone coming out this week if possible. I'm home most afternoons. Located in {city}. Cheers!",
            budget: [80, 150],
            urgency: "within_week"
          },
          {
            title: "Back deck needs sanding and oiling before summer",
            description: "Got a pretty big deck out back (roughly 30-35 square metres I reckon). It's looking pretty rough and winter didn't do it any favours. Want to get it sorted before the BBQ season kicks off! Happy to supply the oil if that helps with the price. Just need someone who knows what they're doing and won't leave a mess. Can do weekends or after 3pm weekdays.",
            budget: [400, 700],
            urgency: "flexible"
          },
          {
            title: "Storm damaged fence section - about 5 metres",
            description: "Bloody storm last week took out a section of my fence between me and the neighbour. About 5 metres worth. Some posts are still good I think but the panels are rooted. Neighbour's keen to go halves on it which is decent of him. Need someone to come have a look and give me a price. I'm in {city}, can send photos if that helps.",
            budget: [300, 600],
            urgency: "urgent"
          },
          {
            title: "Gutter cleaning - two storey house",
            description: "Gutters are absolutely packed with leaves and crud. Two storey house so I'm not keen on doing it myself at my age! Need someone with proper safety gear and a ladder that can handle it. While you're up there wouldn't mind if you could check the spouting is all good too. Located near the {city} CBD.",
            budget: [150, 250],
            urgency: "within_week"
          },
          {
            title: "Interior painting - 3 bedrooms",
            description: "Moving the kids into bigger rooms and want to freshen everything up with a coat of paint. 3 bedrooms total - walls and ceilings. Current colour is magnolia but looking to go with something a bit more modern, maybe a light grey? Prep work needed too as there's a few nail holes and marks. Got the time off work in 2 weeks so would be great to get it done then. Happy to move furniture myself to save costs.",
            budget: [1200, 1800],
            urgency: "flexible"
          }
        ]
      },
      {
        category: "Gardening & Landscaping", 
        projects: [
          {
            title: "Regular lawn mowing - fortnightly through summer",
            description: "Got a fairly big section and my mower just carked it. Rather than buying a new one I figured I'd get someone in to do it properly. Looking for someone reliable who can come every 2 weeks over summer. Lawn's maybe 200sqm? Also got some edges that need doing with a trimmer. I'm usually home on weekends if that suits. {city} area.",
            budget: [40, 70],
            urgency: "within_week"
          },
          {
            title: "Complete garden bed makeover - front yard",
            description: "Front garden is an absolute disaster zone. Previous owners clearly didn't give a toss about it. Looking to rip everything out, get some fresh soil in, and plant some nice natives that don't need too much maintenance. Maybe 6-8 square metres total? Would love some suggestions on what plants would work well. I'm hopeless with gardening so the more low-maintenance the better!",
            budget: [500, 900],
            urgency: "flexible"
          },
          {
            title: "Massive tree overhanging driveway needs trimming",
            description: "We've got this huge tree that's started dropping branches all over the driveway and I'm worried one's gonna come down on the car. Needs a professional with the right gear - it's pretty high up. Also some branches are touching the power lines which makes me nervous. Located in {city}. Can someone come have a look and give me a quote?",
            budget: [300, 600],
            urgency: "urgent"
          }
        ]
      },
      {
        category: "Cleaning",
        projects: [
          {
            title: "End of tenancy clean - need bond back!",
            description: "Moving out next Friday and the rental agreement says it needs to be professionally cleaned. 3 bedroom house, 1 bathroom, decent sized living area. Kitchen needs a good going over, oven's pretty gross if I'm honest. Carpets could probably do with a vacuum but that's included in normal cleaning right? Really need the bond back so want to make sure it's done properly. {city} location.",
            budget: [250, 400],
            urgency: "urgent"
          },
          {
            title: "Weekly house clean - 2 bed flat",
            description: "Both my partner and I work long hours and the flat's getting away on us. Looking for someone to come in once a week - maybe Wednesday or Thursday? Just general cleaning, bathrooms, kitchen, vacuum, that sort of thing. We're pretty tidy people so shouldn't be too much work. Would prefer the same person each week if possible. Must be reliable!",
            budget: [80, 120],
            urgency: "within_week"
          },
          {
            title: "Deep clean needed - haven't done one in ages",
            description: "Okay so I'll be honest, it's been a while since I did a proper deep clean and the place needs it. Every nook and cranny type of clean. Windows, skirting boards, behind the fridge, all that stuff I normally avoid! One bedroom unit, not massive but definitely needs someone who's thorough. I'll be out for the day so you can blast through it without me getting in the way.",
            budget: [180, 280],
            urgency: "flexible"
          }
        ]
      },
      {
        category: "Moving & Delivery",
        projects: [
          {
            title: "House move help - same suburb",
            description: "Moving house in 2 weeks, just across {city} to a new rental. Got a truck sorted but could really do with an extra set of hands (or two?) for loading and unloading. Mainly furniture and boxes. It's a 2 bedroom place, no piano or anything crazy heavy. Probably 3-4 hours work total? Will provide lunch and drinks! Cheers.",
            budget: [150, 250],
            urgency: "within_week"
          },
          {
            title: "Couch delivery from The Warehouse",
            description: "Bought a new couch from The Warehouse but their delivery fee is mental! Need someone to pick it up and bring it to mine in {city}. It's a 3 seater, nothing too massive. Ground floor flat so easy access. I can help carry it in. Would need to do it this weekend if possible as that's when I can be home.",
            budget: [50, 100],
            urgency: "urgent"
          },
          {
            title: "Garage clearout - rubbish to dump",
            description: "Finally getting around to clearing out the garage and there's SO much junk that needs to go to the tip. Reckon it's about a trailer load, maybe a bit more. Old furniture, broken stuff, garden waste, you name it. Need someone with a trailer who can load it up and take it away. I'll help load if needed. {city} area.",
            budget: [100, 200],
            urgency: "flexible"
          }
        ]
      },
      {
        category: "Handyman Services",
        projects: [
          {
            title: "Bunch of odd jobs around the house",
            description: "Got a growing list of little jobs that keep getting pushed to the bottom of the to-do list. Nothing huge but they're starting to add up: squeaky door, wobbly bannister, couple of loose tiles, tap that's a bit stiff, shelf that needs mounting. Would love someone to just come and smash through them all in one go. Got all the parts and screws and stuff, just need someone who actually knows what they're doing! {city}.",
            budget: [150, 300],
            urgency: "flexible"
          },
          {
            title: "Flatpack furniture assembly - IKEA Billy bookcases",
            description: "Ordered 4 Billy bookcases from IKEA for my home office and I absolutely cannot be bothered assembling them. Did one once and it took me 3 hours and looked wonky. Would rather just pay someone who does this all the time. All the boxes are in the spare room ready to go. Should be pretty straightforward job for someone with experience.",
            budget: [80, 150],
            urgency: "within_week"
          },
          {
            title: "Front door lock replacement - playing up",
            description: "Front door lock is getting harder and harder to turn and yesterday I nearly got locked out! Definitely needs replacing before it totally fails. Would prefer a good quality lock, doesn't need to be fancy but I want something solid. {city} area. Can someone come have a look and give me a price? Happy to supply the lock or you can source it, whatever's easier.",
            budget: [120, 250],
            urgency: "urgent"
          }
        ]
      }
    ];

    const results = {
      created: 0,
      errors: [] as string[]
    };

    // Each bot posts 5-8 projects with realistic, human-like content
    for (const bot of clientBots) {
      const numProjects = Math.floor(Math.random() * 4) + 5;
      
      for (let i = 0; i < numProjects; i++) {
        try {
          const template = projectTemplates[Math.floor(Math.random() * projectTemplates.length)];
          const project = template.projects[Math.floor(Math.random() * template.projects.length)];
          
          const title = project.title;
          const city = (bot.profiles as any)?.city_region || "Auckland";
          const description = project.description.replace("{city}", city);
          
          const category = categories.find(c => c.name === template.category);
          if (!category) continue;

          const budgetMin = project.budget[0];
          const budgetMax = project.budget[1];
          const budget = Math.floor(Math.random() * (budgetMax - budgetMin) + budgetMin);

          const { data: newProject, error: projectError } = await supabaseClient
            .from("projects")
            .insert({
              title,
              description,
              category_id: category.id,
              budget,
              urgency: project.urgency,
              client_id: bot.profile_id,
              status: "open"
            })
            .select()
            .single();

          if (projectError) {
            results.errors.push(`Project creation failed: ${projectError.message}`);
            continue;
          }

          await supabaseClient
            .from("bot_activity_logs")
            .insert({
              bot_id: bot.profile_id,
              action_type: "post_project",
              details: { project_title: title }
            });

          results.created++;
        } catch (err: any) {
          results.errors.push(`Error creating project: ${err.message}`);
        }
      }
    }

    console.log(`Created ${results.created} human-like projects with ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        created: results.created,
        errors: results.errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});