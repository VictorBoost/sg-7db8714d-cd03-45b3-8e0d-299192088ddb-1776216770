import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DirectoryAnalytic = Tables<"directory_analytics">;

/**
 * Track a directory listing click
 */
export async function trackDirectoryClick(
  listingId: string
): Promise<{ data: DirectoryAnalytic | null; error: any }> {
  const { data: session } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from("directory_analytics")
    .insert({
      listing_id: listingId,
      visitor_id: session.session?.user.id || null,
    })
    .select()
    .single();

  console.log("Track directory click:", { data, error });
  return { data, error };
}

/**
 * Mark a click as converted to a project
 */
export async function markConversion(
  analyticId: string,
  projectId: string
): Promise<{ data: DirectoryAnalytic | null; error: any }> {
  const { data, error } = await supabase
    .from("directory_analytics")
    .update({
      converted_to_project: true,
      project_id: projectId,
    })
    .eq("id", analyticId)
    .select()
    .single();

  console.log("Mark conversion:", { data, error });
  return { data, error };
}

/**
 * Get analytics for a specific listing (admin only)
 */
export async function getListingAnalytics(listingId: string): Promise<{
  totalClicks: number;
  conversions: number;
  conversionRate: number;
}> {
  const { data, error } = await supabase
    .from("directory_analytics")
    .select("id, converted_to_project")
    .eq("listing_id", listingId);

  if (error || !data) {
    console.error("Get listing analytics error:", error);
    return { totalClicks: 0, conversions: 0, conversionRate: 0 };
  }

  const totalClicks = data.length;
  const conversions = data.filter((d) => d.converted_to_project).length;
  const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

  return { totalClicks, conversions, conversionRate };
}

/**
 * Get overall directory analytics (admin only)
 */
export async function getOverallDirectoryAnalytics(): Promise<{
  data: Array<{
    listing_id: string;
    business_name: string;
    total_clicks: number;
    conversions: number;
    conversion_rate: number;
  }> | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from("directory_analytics")
    .select(`
      listing_id,
      converted_to_project,
      directory_listings!directory_analytics_listing_id_fkey(business_name)
    `);

  if (error || !data) {
    console.error("Get overall analytics error:", error);
    return { data: null, error };
  }

  // Group by listing_id
  const grouped = data.reduce((acc: any, row: any) => {
    const listingId = row.listing_id;
    if (!acc[listingId]) {
      acc[listingId] = {
        listing_id: listingId,
        business_name: row.directory_listings?.business_name || "Unknown",
        total_clicks: 0,
        conversions: 0,
      };
    }
    acc[listingId].total_clicks++;
    if (row.converted_to_project) {
      acc[listingId].conversions++;
    }
    return acc;
  }, {});

  const result = Object.values(grouped).map((item: any) => ({
    ...item,
    conversion_rate:
      item.total_clicks > 0 ? (item.conversions / item.total_clicks) * 100 : 0,
  }));

  return { data: result, error: null };
}