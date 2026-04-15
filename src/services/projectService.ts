import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;

export const projectService = {
  async getAllProjects(status?: string) {
    let query = supabase
      .from("projects")
      .select(`
        *,
        client:profiles!projects_client_id_fkey(id, full_name, email),
        category:categories(id, name, slug),
        bids(count)
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    console.log("getAllProjects:", { data, error });
    if (error) console.error("Projects fetch error:", error);
    return { data, error };
  },

  async getProject(projectId: string) {
    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        client:profiles!projects_client_id_fkey(id, full_name, email, phone, location),
        category:categories(id, name, slug),
        bids(
          *,
          provider:profiles!bids_provider_id_fkey(id, full_name, email, phone, bio)
        )
      `)
      .eq("id", projectId)
      .single();

    console.log("getProject:", { data, error });
    if (error) console.error("Project fetch error:", error);
    return { data, error };
  },

  async createProject(project: ProjectInsert) {
    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();

    console.log("createProject:", { data, error });
    if (error) console.error("Project create error:", error);
    return { data, error };
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    console.log("updateProject:", { data, error });
    if (error) console.error("Project update error:", error);
    return { data, error };
  },

  async deleteProject(projectId: string) {
    const { data, error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    console.log("deleteProject:", { data, error });
    if (error) console.error("Project delete error:", error);
    return { data, error };
  },
};