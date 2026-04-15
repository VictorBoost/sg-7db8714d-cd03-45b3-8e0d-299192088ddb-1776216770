import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    console.log("getProfile:", { data, error });
    if (error) console.error("Profile fetch error:", error);
    return { data, error };
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    
    console.log("updateProfile:", { data, error });
    if (error) console.error("Profile update error:", error);
    return { data, error };
  },

  async toggleUserType(userId: string, type: "client" | "provider", enabled: boolean) {
    const field = type === "client" ? "is_client" : "is_provider";
    const { data, error } = await supabase
      .from("profiles")
      .update({ [field]: enabled })
      .eq("id", userId)
      .select()
      .single();
    
    console.log("toggleUserType:", { data, error });
    if (error) console.error("User type toggle error:", error);
    return { data, error };
  },
};