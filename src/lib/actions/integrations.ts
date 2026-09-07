"use server";

import { getCurrentProfile } from "@/lib/data/profile";
import { disconnectGoogleCalendar } from "@/lib/google/calendar";
import { revalidatePath } from "next/cache";

/**
 * Server-action equivalent of POST /api/google/disconnect, so the
 * Integrations page can gate it behind a confirmation dialog. Same admin
 * check and same underlying `disconnectGoogleCalendar()` as the route.
 */
export async function disconnectCalendarAction() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") throw new Error("Not authorized.");

  await disconnectGoogleCalendar();
  revalidatePath("/settings/integrations");
}
