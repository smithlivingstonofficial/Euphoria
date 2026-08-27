"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registerForEvent(eventId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "UNAUTHENTICATED" };
    }

    // Call the atomic concurrency-safe PostgreSQL function
    const { data, error } = await supabase.rpc("fn_register_event_atomic", {
      p_user_id: user.id,
      p_event_id: eventId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/events`);
    revalidatePath(`/`);

    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register";
    return { success: false, error: msg };
  }
}
