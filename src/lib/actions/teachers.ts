"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/utils/site-url";
import { requireAdmin } from "@/lib/data/profile";
import { getCurrentProfile } from "@/lib/data/profile";
import { logAudit } from "@/lib/actions/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withToast } from "@/lib/toast";

/**
 * Availability is managed by admins for any teacher, or by a teacher for
 * their own slots -- unlike the rest of this file, which stays admin-only.
 */
async function assertCanManageAvailability(teacherId: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (profile.role === "admin") return;

  if (profile.role === "teacher") {
    const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", profile.id).single();
    if (teacher?.id === teacherId) return;
  }

  throw new Error("Not authorized.");
}

export async function createTeacher(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const email = String(formData.get("email"));
  const fullName = String(formData.get("full_name"));
  const timezone = String(formData.get("timezone") || "UTC");

  const siteUrl = await getSiteUrl();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl}/auth/callback`,
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

  const { error: teacherError } = await admin.from("teachers").insert({
    profile_id: userId,
    bio: String(formData.get("bio") || "") || null,
    hourly_rate: formData.get("hourly_rate") ? Number(formData.get("hourly_rate")) : 450,
    currency: String(formData.get("currency") || "PKR"),
  });
  if (teacherError) throw new Error(teacherError.message);

  revalidatePath("/teachers");
  redirect(withToast("/teachers", `${fullName} added successfully`));
}

export async function updateTeacher(teacherId: string, profileId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") || "").trim();
  const timezone = String(formData.get("timezone") || "UTC");
  const email = String(formData.get("email") || "").trim();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, timezone })
    .eq("id", profileId);
  if (profileError) throw new Error(profileError.message);

  // Changing the login email requires the admin API (auth.users), not just
  // the profiles table, so only touch it if it actually changed.
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .single();

  if (email && email !== currentProfile?.email) {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(profileId, { email });
    if (authError) throw new Error(authError.message);

    await admin.from("profiles").update({ email }).eq("id", profileId);
  }

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
  revalidatePath("/teachers");
  redirect(withToast(`/teachers/${teacherId}`, "Teacher updated"));
}

export async function deleteTeacher(teacherId: string, profileId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", profileId).single();

  // Deleting the auth user cascades: profiles -> teachers -> availability,
  // recurring_schedules, class_occurrences. This is a full, irreversible
  // removal of the teacher and everything scheduled with them.
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) throw new Error(error.message);

  await logAudit({ action: "teacher.deleted", entityType: "teacher", entityId: teacherId, entityLabel: profile?.full_name });

  revalidatePath("/teachers");
  redirect(withToast("/teachers", `${profile?.full_name ?? "Teacher"} deleted`));
}

export async function addAvailability(teacherId: string, returnPath: string, formData: FormData) {
  await assertCanManageAvailability(teacherId);
  const supabase = await createClient();

  const days = formData.getAll("day_of_week").map((d) => Number(d));
  const localStartTime = String(formData.get("local_start_time"));
  const localEndTime = String(formData.get("local_end_time"));
  const timezone = String(formData.get("timezone"));

  if (days.length === 0) return;

  const { error } = await supabase.from("teacher_availability").insert(
    days.map((day_of_week) => ({
      teacher_id: teacherId,
      day_of_week,
      local_start_time: localStartTime,
      local_end_time: localEndTime,
      timezone,
    })),
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/dashboard");
  redirect(withToast(returnPath, "Availability added"));
}

export async function removeAvailability(teacherId: string, availabilityId: string, returnPath: string) {
  await assertCanManageAvailability(teacherId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_availability")
    .delete()
    .eq("id", availabilityId)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/dashboard");
  redirect(withToast(returnPath, "Availability removed"));
}
