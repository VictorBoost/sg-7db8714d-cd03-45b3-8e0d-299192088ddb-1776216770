import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type VerificationDocument = Tables<"verification_documents">;
type Reference = Tables<"references">;

export const verificationService = {
  // Upload verification document
  async uploadDocument(file: File, providerId: string, documentType: string, categoryId?: string, subcategoryId?: string) {
    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${providerId}/${documentType}_${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(fileName, file);

    if (uploadError) {
      console.error("File upload error:", uploadError);
      return { data: null, error: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("verification-documents")
      .getPublicUrl(fileName);

    // Create document record
    const { data, error } = await supabase
      .from("verification_documents")
      .insert({
        provider_id: providerId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        document_type: documentType,
        file_url: publicUrl,
        status: "pending",
      })
      .select()
      .single();

    console.log("uploadDocument:", { data, error });
    return { data, error };
  },

  // Get provider's documents
  async getProviderDocuments(providerId: string, subcategoryId?: string) {
    let query = supabase
      .from("verification_documents")
      .select("*")
      .eq("provider_id", providerId);

    if (subcategoryId) {
      query = query.eq("subcategory_id", subcategoryId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    console.log("getProviderDocuments:", { data, error });
    return { data, error };
  },

  // Add reference
  async addReference(providerId: string, subcategoryId: string, referenceData: Partial<Reference>) {
    const { data, error } = await supabase
      .from("references")
      .insert({
        provider_id: providerId,
        subcategory_id: subcategoryId,
        ...referenceData,
      })
      .select()
      .single();

    console.log("addReference:", { data, error });
    return { data, error };
  },

  // Get provider's references
  async getProviderReferences(providerId: string, subcategoryId?: string) {
    let query = supabase
      .from("references")
      .select("*")
      .eq("provider_id", providerId);

    if (subcategoryId) {
      query = query.eq("subcategory_id", subcategoryId);
    }

    const { data, error } = await query.order("created_at");
    console.log("getProviderReferences:", { data, error });
    return { data, error };
  },

  // Get pending verifications (admin only)
  async getPendingVerifications() {
    const { data, error } = await supabase
      .from("verification_documents")
      .select(`
        *,
        provider:profiles!verification_documents_provider_id_fkey(id, full_name, email, phone_number),
        category:categories(id, name),
        subcategory:subcategories(id, name)
      `)
      .eq("status", "pending")
      .order("created_at");

    console.log("getPendingVerifications:", { data, error });
    return { data, error };
  },

  // Approve/reject document
  async updateDocumentStatus(documentId: string, status: string, reviewerId: string, rejectionReason?: string) {
    const { data, error } = await supabase
      .from("verification_documents")
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq("id", documentId)
      .select()
      .single();

    console.log("updateDocumentStatus:", { data, error });
    return { data, error };
  },

  // Update provider verification status
  async updateProviderVerificationStatus(providerId: string, status: string, domesticHelperVerified: boolean) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        verification_status: status,
        domestic_helper_verified: domesticHelperVerified,
      })
      .eq("id", providerId)
      .select()
      .single();

    console.log("updateProviderVerificationStatus:", { data, error });
    return { data, error };
  },
};