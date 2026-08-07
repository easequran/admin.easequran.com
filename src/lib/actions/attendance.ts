"use server";

import { createClient } from "@/lib/supabase/server";
import { convertLeadToStudentRecord } from "@/lib/actions/leads";
import { getCurrentProfile } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/lib/types/database";

/**
 * A teacher may only touch attendance for their own classes -- without this
 * check any teacher could mark/edit any occurrence id, including other
 * teachers' classes, since occurrence ids aren't otherwise secret.
 */
async function assertOwnsOccurrence(occurrenceId: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (profile.role === "teacher") {
    const { data: occurrence } = await supabase
      .from("class_occurrences")
      .select("teachers!inner(profile_id)")
      .eq("id", occurrenceId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((occurrence as any)?.teachers?.profile_id !== profile.id) {
      throw new Error("You can only manage attendance for your own classes.");
    }
  } else if (profile.role !== "admin") {
    throw new Error("Not authorized.");
  }

  return profile;
}

export async function markAttendance(occurrenceId: string, formData: FormData) {
  const supabase = await createClient();
  const profile = await assertOwnsOccurrence(occurrenceId);
  const user = { id: profile.id };

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

  // A trial the student showed up for is a confirmed lead — turn it into a
  // real student record automatically instead of requiring a separate
  // manual "Convert to student" click. A trial they missed marks the lead
  // lost, mirroring the same sync `updateOccurrenceStatus` does when admin
  // marks a trial's outcome directly from the Trials page.
  const { data: occurrence } = await supabase
    .from("class_occurrences")
    .select("is_trial, lead_id, student_id")
    .eq("id", occurrenceId)
    .single();

  if (occurrence?.is_trial && occurrence.lead_id) {
    const { data: lead } = await supabase.from("leads").select("status").eq("id", occurrence.lead_id).single();

    if (lead?.status !== "converted") {
      if (status !== "absent" && !occurrence.student_id) {
        const studentId = await convertLeadToStudentRecord(occurrence.lead_id, "trial");
        await supabase.from("class_occurrences").update({ student_id: studentId }).eq("id", occurrenceId);
        revalidatePath("/students");
      } else if (status === "absent") {
        await supabase.from("leads").update({ status: "lost" }).eq("id", occurrence.lead_id);
      }
      revalidatePath("/leads");
    }
  }

  revalidatePath("/attendance");
  revalidatePath("/trials");
}

export async function updateAttendanceNote(occurrenceId: string, formData: FormData) {
  const supabase = await createClient();
  await assertOwnsOccurrence(occurrenceId);

  const notes = String(formData.get("notes") || "") || null;

  const { error } = await supabase.from("attendance").update({ notes }).eq("occurrence_id", occurrenceId);
  if (error) throw new Error(error.message);

  revalidatePath("/attendance");
  revalidatePath("/students");
}
