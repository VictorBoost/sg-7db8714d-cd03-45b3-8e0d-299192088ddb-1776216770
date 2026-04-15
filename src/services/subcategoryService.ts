import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Subcategory = Tables<"subcategories">;

export const subcategoryService = {
  // Get subcategories for a category
  async getSubcategoriesByCategory(categoryId: string) {
    const { data, error } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("display_order");

    console.log("getSubcategoriesByCategory:", { data, error });
    return { data, error };
  },

  // Get all subcategories
  async getAllSubcategories() {
    const { data, error } = await supabase
      .from("subcategories")
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq("is_active", true)
      .order("display_order");

    console.log("getAllSubcategories:", { data, error });
    return { data, error };
  },
};