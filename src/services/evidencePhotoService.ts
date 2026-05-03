import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EvidencePhotoStatus = "not_uploaded" | "uploaded" | "confirmed";
export type PhotoType = "before" | "after";
export type UploaderRole = "client" | "provider";

export interface EvidencePhoto {
  id: string;
  contract_id: string;
  photo_type: PhotoType;
  uploader_role: UploaderRole;
  photo_urls: string[];
  status: EvidencePhotoStatus;
  confirmed_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidencePhotoUpload {
  contract_id: string;
  photo_type: PhotoType;
  uploader_role: UploaderRole;
  photo_urls: string[];
}

export interface EvidenceStatusSummary {
  client_before: EvidencePhotoStatus;
  provider_before: EvidencePhotoStatus;
  client_after: EvidencePhotoStatus;
  provider_after: EvidencePhotoStatus;
  both_before_confirmed: boolean;
  both_after_confirmed: boolean;
}

/**
 * Get all evidence photos for a contract
 */
export async function getContractEvidencePhotos(
  contractId: string
): Promise<EvidencePhoto[]> {
  const { data, error } = await supabase
    .from("contract_evidence_photos")
    .select("*")
    .eq("contract_id", contractId)
    .order("photo_type", { ascending: true })
    .order("uploader_role", { ascending: true });

  if (error) {
    console.error("Error fetching evidence photos:", error);
    throw error;
  }

  return data as EvidencePhoto[];
}

/**
 * Get evidence status summary for a contract
 */
export async function getEvidenceStatusSummary(
  contractId: string
): Promise<EvidenceStatusSummary> {
  const photos = await getContractEvidencePhotos(contractId);

  const getStatus = (type: PhotoType, role: UploaderRole): EvidencePhotoStatus => {
    const photo = photos.find(p => p.photo_type === type && p.uploader_role === role);
    return photo?.status || "not_uploaded";
  };

  const clientBefore = getStatus("before", "client");
  const providerBefore = getStatus("before", "provider");
  const clientAfter = getStatus("after", "client");
  const providerAfter = getStatus("after", "provider");

  return {
    client_before: clientBefore,
    provider_before: providerBefore,
    client_after: clientAfter,
    provider_after: providerAfter,
    both_before_confirmed: clientBefore === "confirmed" && providerBefore === "confirmed",
    both_after_confirmed: clientAfter === "confirmed" && providerAfter === "confirmed"
  };
}

/**
 * Upload or update evidence photos
 */
export async function uploadEvidencePhotos(
  data: EvidencePhotoUpload
): Promise<EvidencePhoto> {
  // Check if record exists
  const { data: existing } = await supabase
    .from("contract_evidence_photos")
    .select("*")
    .eq("contract_id", data.contract_id)
    .eq("photo_type", data.photo_type)
    .eq("uploader_role", data.uploader_role)
    .single();

  if (existing) {
    // Update existing record
    const { data: updated, error } = await supabase
      .from("contract_evidence_photos")
      .update({
        photo_urls: data.photo_urls,
        status: "uploaded",
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating evidence photos:", error);
      throw error;
    }

    return updated as EvidencePhoto;
  } else {
    // Insert new record
    const { data: inserted, error } = await supabase
      .from("contract_evidence_photos")
      .insert({
        contract_id: data.contract_id,
        photo_type: data.photo_type,
        uploader_role: data.uploader_role,
        photo_urls: data.photo_urls,
        status: "uploaded"
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting evidence photos:", error);
      throw error;
    }

    return inserted as EvidencePhoto;
  }
}

/**
 * Confirm evidence photos (locks them permanently)
 */
export async function confirmEvidencePhotos(
  contractId: string,
  photoType: PhotoType,
  uploaderRole: UploaderRole
): Promise<EvidencePhoto> {
  const { data, error } = await supabase
    .from("contract_evidence_photos")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("contract_id", contractId)
    .eq("photo_type", photoType)
    .eq("uploader_role", uploaderRole)
    .select()
    .single();

  if (error) {
    console.error("Error confirming evidence photos:", error);
    throw error;
  }

  return data as EvidencePhoto;
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadPhotoToStorage(
  file: File,
  contractId: string,
  photoType: PhotoType,
  uploaderRole: UploaderRole
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${contractId}/${photoType}/${uploaderRole}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("evidence-photos")
    .upload(fileName, file);

  if (error) {
    console.error("Error uploading photo:", error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("evidence-photos")
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Delete photo from storage
 */
export async function deletePhotoFromStorage(photoUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = photoUrl.split("/evidence-photos/");
  if (urlParts.length < 2) return;

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from("evidence-photos")
    .remove([filePath]);

  if (error) {
    console.error("Error deleting photo:", error);
    throw error;
  }
}

/**
 * Get contracts needing evidence photo reminders
 * (24 hours past work date and photos not uploaded)
 */
export async function getContractsNeedingReminders(): Promise<string[]> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  // Get contracts where work date was 24+ hours ago
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, project_id, projects!inner(specific_date)")
    .eq("status", "active")
    .lte("projects.specific_date", twentyFourHoursAgo.toISOString());

  if (!contracts) return [];

  // Filter contracts where reminders are needed
  const needsReminder: string[] = [];

  for (const contract of contracts) {
    const { data: photos } = await supabase
      .from("contract_evidence_photos")
      .select("*")
      .eq("contract_id", contract.id)
      .in("status", ["not_uploaded", "uploaded"])
      .is("reminder_sent_at", null);

    if (photos && photos.length > 0) {
      needsReminder.push(contract.id);
    }
  }

  return needsReminder;
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(
  contractId: string,
  photoType: PhotoType,
  uploaderRole: UploaderRole
): Promise<void> {
  await supabase
    .from("contract_evidence_photos")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("contract_id", contractId)
    .eq("photo_type", photoType)
    .eq("uploader_role", uploaderRole);
}