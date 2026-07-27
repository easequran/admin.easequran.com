"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTeacher(formData: FormData) {
  const admin = createAdminClient();

  const email = String(formData.get("email"));
  const fullName = String(formData.get("full_name"));
  const timezone = String(formData.get("timezone") || "UTC");

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (inviteError) throw new Error(inviteError.message);

  const userId = invited.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role: "teacher",
    full_name: fullName,
    email,
    timezone,
  });
  if (profileError) throw new Error(profileError.message);

  const { data: teacher, error: teacherError } = await admin
    .from("teachers")
    .insert({
      profile_id: userId,
      bio: String(formData.get("bio") || "") || null,
      hourly_rate: formData.get("hourly_rate") ? Number(formData.get("hourly_rate")) : 450,
      currency: String(formData.get("currency") || "PKR"),
    })
    .select("id")
    .single();
  if (teacherError) throw new Error(teacherError.message);

  revalidatePath("/teachers");
  redirect(`/teachers/${teacher.id}`);
}

export async function updateTeacher(teacherId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("teachers")
    .update({
      bio: String(formData.get("bio") || "") || null,
      hourly_rate: formData.get("hourly_rate") ? Number(formData.get("hourly_rate")) : null,
      currency: String(formData.get("currency") || "USD"),
      active: formData.get("active") === "on",
    })
    .eq("id", teacherId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teachers/${teacherId}`);
}

export async function addAvailability(teacherId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("teacher_availability").insert({
    teacher_id: teacherId,
    day_of_week: Number(formData.get("day_of_week")),
    local_start_time: String(formData.get("local_start_time")),
    local_end_time: String(formData.get("local_end_time")),
    timezone: String(formData.get("timezone")),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/teachers/${teacherId}`);
}

export async function removeAvailability(teacherId: string, availabilityId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_availability").delete().eq("id", availabilityId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teachers/${teacherId}`);
}
