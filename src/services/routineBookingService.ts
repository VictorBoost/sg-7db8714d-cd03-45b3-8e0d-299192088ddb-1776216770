import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type RoutineBooking = Tables<"routine_bookings">;

export const routineBookingService = {
  // Create routine bookings (up to 8 weeks)
  async createRoutineBookings(
    projectId: string,
    providerId: string,
    clientId: string,
    selectedDays: string[],
    startDate: Date,
    weeksCount: number
  ) {
    const bookings: any[] = [];
    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    // Generate bookings for each week
    for (let week = 0; week < weeksCount; week++) {
      for (const day of selectedDays) {
        const dayNumber = dayMap[day.toLowerCase()];
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + (week * 7) + (dayNumber - startDate.getDay()));

        bookings.push({
          project_id: projectId,
          provider_id: providerId,
          client_id: clientId,
          session_date: sessionDate.toISOString().split("T")[0],
          day_of_week: day.toLowerCase(),
          status: "scheduled",
        });
      }
    }

    const { data, error } = await supabase
      .from("routine_bookings")
      .insert(bookings)
      .select();

    console.log("createRoutineBookings:", { data, error, count: bookings.length });
    return { data, error };
  },

  // Get provider's schedule
  async getProviderSchedule(providerId: string, startDate?: Date, endDate?: Date) {
    let query = supabase
      .from("routine_bookings")
      .select(`
        *,
        project:projects(id, title, category_id, subcategory_id),
        client:profiles!routine_bookings_client_id_fkey(id, full_name, phone_number, city_region)
      `)
      .eq("provider_id", providerId)
      .order("session_date");

    if (startDate) {
      query = query.gte("session_date", startDate.toISOString().split("T")[0]);
    }
    if (endDate) {
      query = query.lte("session_date", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    console.log("getProviderSchedule:", { data, error });
    return { data, error };
  },

  // Get client's bookings
  async getClientBookings(clientId: string, startDate?: Date, endDate?: Date) {
    let query = supabase
      .from("routine_bookings")
      .select(`
        *,
        project:projects(id, title, category_id, subcategory_id),
        provider:profiles!routine_bookings_provider_id_fkey(id, full_name, phone_number)
      `)
      .eq("client_id", clientId)
      .order("session_date");

    if (startDate) {
      query = query.gte("session_date", startDate.toISOString().split("T")[0]);
    }
    if (endDate) {
      query = query.lte("session_date", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    console.log("getClientBookings:", { data, error });
    return { data, error };
  },

  // Update booking status
  async updateBookingStatus(bookingId: string, status: string, contractId?: string) {
    const updates: any = { status };
    if (contractId) {
      updates.contract_id = contractId;
    }

    const { data, error } = await supabase
      .from("routine_bookings")
      .update(updates)
      .eq("id", bookingId)
      .select()
      .single();

    console.log("updateBookingStatus:", { data, error });
    return { data, error };
  },
};