"use server";

import { createClient } from "@/lib/supabase/server";
import { convertLeadToStudentRecord } from "@/lib/actions/leads";
import { getCurrentProfile } from "@/lib/data/profile";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/lib/types/database";

export async function markAttendance(occurrenceId: string, formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const user = { id: profile.id };

  // A teacher may only mark attendance for their own classes -- without
  // this check any teacher could mark any occurrence id, including other
  // teachers' classes, since occurrence ids aren't otherwise secret.
  if (profile.role === "teacher") {
    const { data: occurrence } = await supabase
      .from("class_occurrences")
      .select("teachers!inner(profile_id)")
      .eq("id", occurrenceId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((occurrence as any)?.teachers?.profile_id !== profile.id) {
      throw new Error("You can only mark attendance for your own classes.");
    }
  } else if (profile.role !== "admin") {
    throw new Error("Not authorized.");
  }

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
  // manual "Convert to student" click.
  if (status !== "absent") {
    const { data: occurrence } = await supabase
      .from("class_occurrences")
      .select("is_trial, lead_id, student_id")
      .eq("id", occurrenceId)
      .single();

    if (occurrence?.is_trial && occurrence.lead_id && !occurrence.student_id) {
      const studentId = await convertLeadToStudentRecord(occurrence.lead_id, "trial");
      await supabase.from("class_occurrences").update({ student_id: studentId }).eq("id", occurrenceId);
      revalidatePath("/students");
      revalidatePath("/leads");
    }
  }

  revalidatePath("/attendance");
}
