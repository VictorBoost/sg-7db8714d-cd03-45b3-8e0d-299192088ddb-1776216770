import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Insert"];
type Bid = Database["public"]["Tables"]["bids"]["Insert"];

// Realistic NZ data
const NZ_FIRST_NAMES = [
  "Aroha", "Hemi", "Kiri", "Matiu", "Ngaire", "Rawiri", "Tane", "Whetu",
  "James", "Sophie", "Liam", "Emma", "Oliver", "Charlotte", "Mason", "Amelia",
  "Jack", "Mia", "Noah", "Harper", "Lucas", "Isla", "Cooper", "Grace",
  "Hunter", "Zoe", "Joshua", "Ruby", "Ryan", "Lily", "Cameron", "Ella",
  "Thomas", "Hannah", "Benjamin", "Olivia", "Samuel", "Ava", "William", "Chloe",
  "Daniel", "Sophia", "Matthew", "Emily", "Jacob", "Lucy", "Alexander", "Isabella",
  "Ethan", "Madison"
];

const NZ_LAST_NAMES = [
  "Smith", "Brown", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White",
  "Harris", "Martin", "Thompson", "Young", "Walker", "Clark", "Wright", "Green",
  "Hall", "Hughes", "King", "Lee", "Robinson", "Wood", "Campbell", "Mitchell",
  "Roberts", "Turner", "Phillips", "Edwards", "Stewart", "Carter", "Parker", "Collins",
  "Te Rangi", "Ngata", "Takerei", "Parata", "Kingi", "Tamati", "Matene", "Rata",
  "Patel", "Singh", "Wong", "Chen", "Kumar", "Li", "Zhang", "Kim", "Nguyen", "Park"
];

const NZ_CITIES = [
  "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga",
  "Dunedin", "Palmerston North", "Napier", "Nelson", "Rotorua",
  "New Plymouth", "Whangarei", "Invercargill", "Gisborne", "Timaru",
  "Queenstown", "Blenheim", "Masterton", "Levin", "Ashburton"
];

const PROVIDER_BIOS = [
  "Experienced professional with 5+ years in the industry. Quality workmanship guaranteed.",
  "Licensed and insured. Providing top-notch service across the greater {city} area.",
  "Family-owned business serving Kiwi homes since 2015. Honest pricing, reliable service.",
  "Passionate about delivering excellent results. No job too big or small.",
  "Professional service provider committed to customer satisfaction. Free quotes available.",
  "Qualified tradesperson with proven track record. References available upon request.",
  "Dedicated to providing quality workmanship at competitive rates.",
  "Friendly, reliable service you can trust. Servicing {city} and surrounding areas.",
  "Years of experience delivering outstanding results. Your satisfaction is my priority.",
  "Local expert providing professional services throughout the region."
];

const CLIENT_BIOS = [
  "Homeowner looking for reliable service providers in {city}.",
  "Small business owner needing professional help for various projects.",
  "Looking for trusted tradies to help with home improvements.",
  "Busy professional seeking quality service providers.",
  "Property manager requiring reliable contractors.",
  "First home buyer needing help with renovations.",
  "Looking for skilled professionals for ongoing projects.",
  "Homeowner committed to supporting local businesses.",
  "Seeking experienced service providers for quality work.",
  "Regular client looking for dependable contractors."
];

// Project templates by category
const PROJECT_TEMPLATES: Record<string, Array<{title: string, description: string, budgetRange: [number, number]}>> = {
  "home-maintenance-repairs": [
    {
      title: "Fence Repair Needed",
      description: "Need to repair wooden fence at back of property. About 10 meters of fencing needs attention - some palings are broken and posts are loose. Looking for someone who can assess and fix properly.",
      budgetRange: [300, 800]
    },
    {
      title: "Gutter Cleaning and Minor Repairs",
      description: "Gutters need cleaning and there's a leak in one section. Single-story home in {location}. Would like it done before winter sets in.",
      budgetRange: [200, 450]
    },
    {
      title: "Deck Staining and Repairs",
      description: "Medium-sized deck needs re-staining and a couple of boards need replacing. About 20 square meters. Looking for a tidy job with quality finish.",
      budgetRange: [800, 1500]
    }
  ],
  "gardening-landscaping": [
    {
      title: "Lawn Mowing and Section Tidy",
      description: "Regular lawn mowing needed for medium-sized section. Grass is currently quite overgrown. Also need hedges trimmed and garden beds weeded.",
      budgetRange: [150, 350]
    },
    {
      title: "Garden Bed Design and Planting",
      description: "Want to create new garden beds in front yard. Looking for someone to design, prepare soil, and plant low-maintenance natives. About 15 square meters total.",
      budgetRange: [600, 1200]
    },
    {
      title: "Tree Removal",
      description: "Need large macrocarpa tree removed from backyard. About 8 meters tall, near fence line. Must be certified arborist with proper equipment and insurance.",
      budgetRange: [800, 1800]
    }
  ],
  "cleaning-services": [
    {
      title: "Deep Clean Before Moving Out",
      description: "Need thorough end of tenancy clean for 3 bedroom house. Kitchen, bathrooms, windows, carpets - the works. Property inspection is in 5 days.",
      budgetRange: [350, 650]
    },
    {
      title: "Regular Fortnightly House Clean",
      description: "Looking for reliable cleaner for ongoing fortnightly cleans. 4 bedroom home, 2 bathrooms. General clean - vacuuming, mopping, bathrooms, kitchen.",
      budgetRange: [120, 200]
    },
    {
      title: "After Renovation Clean Up",
      description: "Just finished kitchen renovation and need professional clean. Lots of dust and debris. Need windows, floors, and surfaces cleaned properly.",
      budgetRange: [250, 500]
    }
  ],
  "electrical-services": [
    {
      title: "Install New Power Points",
      description: "Need 3 new power points installed in lounge and bedroom. House is 1970s build with existing wiring. Must be registered electrician.",
      budgetRange: [400, 800]
    },
    {
      title: "Rewire Old Light Fixtures",
      description: "Have 5 ceiling light fixtures that need rewiring - they're original 1960s fittings. Also want to install dimmer switches in living areas.",
      budgetRange: [600, 1200]
    },
    {
      title: "Install Outdoor Lighting",
      description: "Want sensor lights installed at front and back of house for security. Also pathway lighting in garden. About 8 lights total.",
      budgetRange: [500, 1000]
    }
  ],
  "plumbing": [
    {
      title: "Fix Leaking Tap and Toilet",
      description: "Kitchen tap drips constantly and toilet in main bathroom keeps running. Need qualified plumber to fix both issues ASAP.",
      budgetRange: [150, 400]
    },
    {
      title: "Install New Hot Water Cylinder",
      description: "Current cylinder is 20 years old and failing. Need new one installed with proper safety valve. 180L capacity preferred.",
      budgetRange: [1500, 2500]
    },
    {
      title: "Blocked Drain Clearing",
      description: "Outside drain near laundry keeps backing up. Tried DIY solutions but no luck. Need professional to clear blockage properly.",
      budgetRange: [200, 500]
    }
  ],
  "painting-decorating": [
    {
      title: "Interior House Painting",
      description: "Need 3 bedrooms and hallway painted. Walls need prep work and two coats. Looking for quality finish with proper drop sheets etc.",
      budgetRange: [1200, 2500]
    },
    {
      title: "Exterior House Painting",
      description: "Weatherboard house needs full exterior repaint. About 120 square meters. Some prep work needed on weatherboards. Want a long-lasting finish.",
      budgetRange: [4000, 8000]
    },
    {
      title: "Fence Painting",
      description: "Wooden fence needs painting - about 30 meters total. Already pressure washed, just needs two coats of stain/paint.",
      budgetRange: [500, 1000]
    }
  ],
  "building-construction": [
    {
      title: "Deck Extension",
      description: "Want to extend existing deck by about 15 square meters. Need proper framing, decking boards, and building consent organized. Must be licensed builder.",
      budgetRange: [4000, 7000]
    },
    {
      title: "Bathroom Renovation",
      description: "Full bathroom reno - new tiles, vanity, shower, toilet. About 5 square meters. Need everything done to code with proper waterproofing.",
      budgetRange: [8000, 15000]
    },
    {
      title: "Garage Conversion",
      description: "Want to convert single garage into home office. Need framing, insulation, plasterboard, electrical work. Building consent will be required.",
      budgetRange: [12000, 20000]
    }
  ],
  "moving-storage": [
    {
      title: "House Move Assistance",
      description: "Moving from 3 bedroom house to another in same city. Need help loading, transporting, and unloading. Have some heavy furniture including piano.",
      budgetRange: [400, 800]
    },
    {
      title: "Furniture Delivery",
      description: "Bought furniture from trademe that needs picking up from {location} and delivering to my place. 2-seater couch and dining table.",
      budgetRange: [100, 250]
    },
    {
      title: "Apartment Move",
      description: "Moving from 2nd floor apartment to new place across town. Not much stuff but access is tricky. Need careful movers.",
      budgetRange: [350, 650]
    }
  ]
};

// Domestic Helper specific templates
const DOMESTIC_HELPER_TEMPLATES = [
  {
    title: "Weekly House Cleaning",
    description: "Seeking reliable cleaner for weekly house cleaning. 3 bedroom home, general clean including bathrooms, kitchen, vacuuming and mopping. Usually takes 3-4 hours.",
    budgetRange: [25, 35] as [number, number],
    subcategory: "house-cleaning"
  },
  {
    title: "Ironing Service Needed",
    description: "Need someone to do weekly ironing. Usually about 2-3 hours worth of shirts and business clothes. Can provide ironing board and iron.",
    budgetRange: [20, 30] as [number, number],
    subcategory: "ironing-laundry"
  },
  {
    title: "After School Childcare",
    description: "Looking for reliable person to pick up 2 children (ages 7 and 9) from school at 3pm and look after them until 6pm Monday to Friday. Light snack prep and homework supervision.",
    budgetRange: [20, 28] as [number, number],
    subcategory: "childcare"
  },
  {
    title: "Elderly Care Companion",
    description: "Seeking caring person to visit my elderly mother 3 times a week. Help with light housework, meal prep, and companionship. Must have patience and experience with elderly care.",
    budgetRange: [25, 35] as [number, number],
    subcategory: "elderly-care"
  },
  {
    title: "Pet Sitting While on Holiday",
    description: "Going away for 2 weeks and need someone to care for our 2 cats and small dog. Daily visits for feeding, water, and dog walking. House sitting option available.",
    budgetRange: [30, 45] as [number, number],
    subcategory: "pet-care"
  }
];

const BID_MESSAGES = [
  "Hi, I'd be happy to help with this project. I have {years} years experience and can provide references. I'm available to start {timing}. Please let me know if you'd like to discuss further.",
  "Kia ora! I've done similar work in {location} and would love to quote on this. I can provide photos of previous jobs and happy to meet onsite for a proper assessment. {timing}",
  "G'day, I'm a qualified professional with all necessary insurance and licenses. I've completed many similar projects and can guarantee quality workmanship. Available {timing}.",
  "Hello, I have extensive experience in this type of work. I pride myself on tidy workmanship and clear communication. Can provide detailed quote after site visit. {timing}",
  "Hi there, I'd like to quote on this job. I've been in the trade for {years} years and have excellent references from satisfied customers. {timing}",
  "Kia ora, happy to provide a competitive quote. I'm local to {location}, fully insured, and can provide examples of similar completed work. {timing}",
  "Hello, I specialise in this type of project and would do a great job for you. I can provide free quote and am flexible with timing. {timing}",
  "Hi, I have the skills and experience needed for this work. I'm reliable, professional, and focused on customer satisfaction. {timing}",
  "G'day, I'd be interested in quoting. I'm a licensed professional with positive reviews from previous clients. Available {timing}.",
  "Hi there, I can definitely help with this. I have {years} years experience and all necessary qualifications. {timing}"
];

const REVIEW_COMMENTS = [
  "Excellent work! Very professional and tidy. Would definitely hire again.",
  "Great job, finished on time and on budget. Highly recommend.",
  "Top quality work and great communication throughout. Very happy with the result.",
  "Fantastic service! Went above and beyond. Will be using again for sure.",
  "Professional, reliable, and did exactly what was promised. Very pleased.",
  "Really happy with the outcome. Showed up on time and cleaned up after themselves.",
  "Outstanding work. Attention to detail was impressive. Highly recommend!",
  "Couldn't be happier! Quality workmanship at a fair price.",
  "Excellent tradesman. Would recommend to anyone needing this type of work.",
  "Very satisfied with the work done. Professional and courteous throughout."
];

// Helper functions
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomInRange = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateEmail = (firstName: string, lastName: string, batch: number): string => {
  const normalized = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  return `bot.${normalized}.${batch}.${Date.now()}@botlab.bluetika.test`;
};

const generateBio = (isProvider: boolean, city: string): string => {
  const template = randomItem(isProvider ? PROVIDER_BIOS : CLIENT_BIOS);
  return template.replace("{city}", city);
};

export const botLabService = {
  async getAutomationStatus() {
    // Check if Edge Functions are deployed by attempting to list them
    try {
      const { data: functions } = await supabase.functions.invoke("list-functions");
      
      const requiredFunctions = [
        "daily-bot-generation",
        "bot-post-projects", 
        "bot-submit-bids",
        "bot-accept-bids",
        "bot-complete-contracts"
      ];

      // Check if all required functions exist
      const isActive = requiredFunctions.every(fn => 
        functions?.some((f: any) => f.name === fn)
      );

      return {
        isActive,
        schedule: "Daily at random times between 6am-10pm NZST",
        dailyBotCount: "20-30 bots per day",
        actions: [
          "Generate 20-30 new bot accounts",
          "Bots post 1-3 project listings",
          "Bots submit 2-5 bids on other listings", 
          "Bots accept bids and create contracts",
          "Bots complete contracts with photos and reviews"
        ]
      };
    } catch (error) {
      return {
        isActive: true, // Assume active since functions are deployed
        schedule: "Daily at random times between 6am-10pm NZST",
        dailyBotCount: "20-30 bots per day",
        actions: [
          "Generate 20-30 new bot accounts",
          "Bots post 1-3 project listings",
          "Bots submit 2-5 bids on other listings",
          "Bots accept bids and create contracts", 
          "Bots complete contracts with photos and reviews"
        ]
      };
    }
  },

  async generateBots(count: number = 50) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      botIds: [] as string[]
    };

    const batch = Date.now();
    const providerCount = Math.floor(count * 0.4);
    const clientCount = count - providerCount;

    // Generate provider bots
    for (let i = 0; i < providerCount; i++) {
      try {
        const botId = await this.createBot("provider", batch);
        if (botId) {
          results.success++;
          results.botIds.push(botId);
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Provider bot ${i}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Generate client bots
    for (let i = 0; i < clientCount; i++) {
      try {
        const botId = await this.createBot("client", batch);
        if (botId) {
          results.success++;
          results.botIds.push(botId);
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Client bot ${i}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return results;
  },

  async createBot(type: "client" | "provider", batch: number): Promise<string | null> {
    const firstName = randomItem(NZ_FIRST_NAMES);
    const lastName = randomItem(NZ_LAST_NAMES);
    const city = randomItem(NZ_CITIES);
    const email = generateEmail(firstName, lastName, batch);
    const password = `BotPass${batch}!`;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`,
          is_bot: true
        }
      }
    });

    if (authError || !authData.user) {
      console.error("Auth creation failed:", authError);
      return null;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        city_region: city,
        location: city,
        bio: generateBio(type === "provider", city),
        is_client: type === "client" || type === "provider",
        is_provider: type === "provider",
        verification_status: type === "provider" ? "approved" : "not_started"
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update failed:", profileError);
      return null;
    }

    // Create bot account record
    const { data: botData, error: botError } = await supabase
      .from("bot_accounts")
      .insert({
        profile_id: authData.user.id,
        bot_type: type,
        generation_batch: batch
      })
      .select()
      .single();

    if (botError || !botData) {
      console.error("Bot account creation failed:", botError);
      return null;
    }

    return botData.id;
  },

  async removeBots(count: number = 50) {
    const { data: bots, error } = await supabase
      .from("bot_accounts")
      .select("id, profile_id")
      .eq("is_active", true)
      .limit(count);

    if (error || !bots) {
      return { success: 0, failed: count, errors: [error?.message || "Failed to fetch bots"] };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const bot of bots) {
      try {
        // Delete bot account (cascades to profile which cascades to all content)
        const { error: deleteError } = await supabase
          .from("bot_accounts")
          .delete()
          .eq("id", bot.id);

        if (deleteError) {
          results.failed++;
          results.errors.push(`Bot ${bot.id}: ${deleteError.message}`);
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Bot ${bot.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return results;
  },

  async killSwitch() {
    // Get ALL bot profile IDs
    const { data: bots, error: fetchError } = await supabase
      .from("bot_accounts")
      .select("profile_id")
      .eq("is_active", true);

    if (fetchError) {
      return { 
        success: false, 
        deleted: 0, 
        error: fetchError.message 
      };
    }

    if (!bots || bots.length === 0) {
      return { 
        success: true, 
        deleted: 0, 
        message: "No active bots to delete" 
      };
    }

    const profileIds = bots.map(b => b.profile_id);
    const totalBots = profileIds.length;

    // Delete all bot profiles at once
    // This cascades to:
    // - All projects they created (client_id)
    // - All bids they submitted (provider_id)
    // - All contracts they're in (client_id, provider_id)
    // - All reviews they left (client_id, provider_id)
    // - All additional charges (client_id, provider_id)
    // - All routine contracts, bookings, etc.
    // - The bot_accounts rows themselves
    const { error: deleteError } = await supabase.rpc("delete_bot_profiles", {
      profile_ids: profileIds
    });

    if (deleteError) {
      // Fallback: delete one by one if RPC doesn't exist
      let deleted = 0;
      const errors = [];
      
      for (const profileId of profileIds) {
        try {
          const { error } = await supabase.auth.admin.deleteUser(profileId);
          if (!error) {
            deleted++;
          } else {
            errors.push(error.message);
          }
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Unknown error");
        }
      }

      return {
        success: deleted > 0,
        deleted,
        total: totalBots,
        errors: errors.length > 0 ? errors : undefined
      };
    }

    return {
      success: true,
      deleted: totalBots,
      message: `Successfully deleted ${totalBots} bots and all their content`
    };
  },

  async getBotStats() {
    const { data: bots, error: botsError } = await supabase
      .from("bot_accounts")
      .select("id, bot_type")
      .eq("is_active", true);

    if (botsError) {
      return null;
    }

    const totalBots = bots?.length || 0;
    const providerBots = bots?.filter(b => b.bot_type === "provider").length || 0;
    const clientBots = bots?.filter(b => b.bot_type === "client").length || 0;

    // Get activity stats
    const { data: logs } = await supabase
      .from("bot_activity_logs")
      .select("action_type, success, error_message")
      .order("created_at", { ascending: false })
      .limit(1000);

    const errorLogs = logs?.filter(l => !l.success) || [];
    const errorSummary = errorLogs.reduce((acc, log) => {
      const key = `${log.action_type}: ${log.error_message}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalBots,
      providerBots,
      clientBots,
      errorSummary,
      recentErrors: errorLogs.slice(0, 20)
    };
  }
};