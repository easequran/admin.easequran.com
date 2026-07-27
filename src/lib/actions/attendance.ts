"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/lib/types/database";

export async function markAttendance(occurrenceId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = formData.get("status") as AttendanceStatus;
  const notes = String(formData.get("notes") || "") || null;

  const { error } = await supabase.from("attendance").upsert(
    {
      occurrence_id: occurrenceId,
      status,
      notes,
      marked_by: user?.id,
      marked_at: new Date().toISOString(),
    },
    { onConflict: "occurrence_id" },
  );
  if (error) throw new Error(error.message);

  await supabase
    .from("class_occurrences")
    .update({ status: status === "absent" ? "no_show" : "completed" })
    .eq("id", occurrenceId);

  revalidatePath("/attendance");
}
