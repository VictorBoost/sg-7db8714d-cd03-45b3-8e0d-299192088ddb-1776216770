import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export interface ProviderBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: number; // Lower number = higher priority for display
}

export const BADGE_DEFINITIONS: Record<string, ProviderBadge> = {
  verified: {
    id: "verified",
    name: "Verified",
    description: "NZ Driver Licence approved",
    icon: "✓",
    color: "bg-success/10 text-success border-success/20",
    priority: 1,
  },
  platinum: {
    id: "platinum",
    name: "Platinum",
    description: "60-day sales $5,000+",
    icon: "💎",
    color: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
    priority: 2,
  },
  gold: {
    id: "gold",
    name: "Gold",
    description: "60-day sales $2,000 - $4,999",
    icon: "🥇",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    priority: 3,
  },
  silver: {
    id: "silver",
    name: "Silver",
    description: "60-day sales $501 - $1,999",
    icon: "🥈",
    color: "bg-slate-400/10 text-slate-400 border-slate-400/20",
    priority: 4,
  },
  fastest_to_offer: {
    id: "fastest_to_offer",
    name: "Fastest to Offer",
    description: "Bid submitted within 1 hour",
    icon: "⚡",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    priority: 5,
  },
  verified_business: {
    id: "verified_business",
    name: "Verified NZ Business",
    description: "Valid NZBN confirmed",
    icon: "🏢",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    priority: 6,
  },
  domestic_helper_verified: {
    id: "domestic_helper_verified",
    name: "Domestic Helper Verified",
    description: "Police check & first aid confirmed",
    icon: "🛡️",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    priority: 7,
  },
};

/**
 * Calculate which badges a provider has earned
 */
export async function getProviderBadges(
  providerId: string,
  options?: {
    projectId?: string; // For checking fastest_to_offer badge
    categoryId?: string; // For checking domestic_helper_verified badge
  }
): Promise<ProviderBadge[]> {
  const badges: ProviderBadge[] = [];

  // Fetch provider profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", providerId)
    .single();

  if (!profile) return badges;

  // 1. Verified badge (NZ Driver Licence approved)
  if (profile.verification_status === "approved") {
    badges.push(BADGE_DEFINITIONS.verified);
  }

  // 2. Tier badges (Silver, Gold, Platinum) based on commission_tier
  if (profile.commission_tier === "platinum") {
    badges.push(BADGE_DEFINITIONS.platinum);
  } else if (profile.commission_tier === "gold") {
    badges.push(BADGE_DEFINITIONS.gold);
  } else if (profile.commission_tier === "silver") {
    badges.push(BADGE_DEFINITIONS.silver);
  }

  // 3. Fastest to Offer badge (bid submitted within 1 hour of listing)
  if (options?.projectId) {
    const { data: bidData } = await supabase
      .from("bids")
      .select("created_at, projects!inner(created_at)")
      .eq("provider_id", providerId)
      .eq("project_id", options.projectId)
      .single();

    if (bidData) {
      const projectCreated = new Date(bidData.projects.created_at).getTime();
      const bidCreated = new Date(bidData.created_at).getTime();
      const hourInMs = 60 * 60 * 1000;

      if (bidCreated - projectCreated <= hourInMs) {
        badges.push(BADGE_DEFINITIONS.fastest_to_offer);
      }
    }
  }

  // 4. Verified NZ Business badge (NZBN verified)
  if (profile.nzbn_verified) {
    badges.push(BADGE_DEFINITIONS.verified_business);
  }

  // 5. Domestic Helper Verified badge (only shown for domestic helper projects)
  if (options?.categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", options.categoryId)
      .single();

    if (category?.name?.toLowerCase().includes("domestic helper")) {
      if (profile.domestic_helper_verified) {
        badges.push(BADGE_DEFINITIONS.domestic_helper_verified);
      }
    }
  }

  // Sort by priority (lower number = higher priority)
  return badges.sort((a, b) => a.priority - b.priority);
}

/**
 * Get badges for display on bid card (with project context)
 */
export async function getBidBadges(
  providerId: string,
  projectId: string,
  categoryId?: string
): Promise<ProviderBadge[]> {
  return getProviderBadges(providerId, { projectId, categoryId });
}

/**
 * Get badges for profile modal (no project context, show general badges)
 */
export async function getProfileBadges(providerId: string): Promise<ProviderBadge[]> {
  return getProviderBadges(providerId);
}