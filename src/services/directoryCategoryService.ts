import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DirectoryCategory = Tables<"directory_categories">;

/**
 * Get all directory categories
 */
export async function getDirectoryCategories(): Promise<{
  data: DirectoryCategory[] | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from("directory_categories")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  console.log("Directory categories:", { data, error });
  return { data, error };
}

/**
 * Create a new directory category (admin only)
 */
export async function createDirectoryCategory(category: {
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
}): Promise<{ data: DirectoryCategory | null; error: any }> {
  const { data, error } = await supabase
    .from("directory_categories")
    .insert(category)
    .select()
    .single();

  console.log("Create directory category:", { data, error });
  return { data, error };
}

/**
 * Update a directory category (admin only)
 */
export async function updateDirectoryCategory(
  id: string,
  updates: Partial<DirectoryCategory>
): Promise<{ data: DirectoryCategory | null; error: any }> {
  const { data, error } = await supabase
    .from("directory_categories")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  console.log("Update directory category:", { data, error });
  return { data, error };
}

/**
 * Delete a directory category (admin only)
 */
export async function deleteDirectoryCategory(
  id: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from("directory_categories")
    .delete()
    .eq("id", id);

  console.log("Delete directory category:", { error });
  return { error };
}

/**
 * Reorder categories (admin only)
 */
export async function reorderDirectoryCategories(
  updates: { id: string; display_order: number }[]
): Promise<{ error: any }> {
  const { error } = await supabase
    .from("directory_categories")
    .upsert(updates as any);

  console.log("Reorder categories:", { error });
  return { error };
}