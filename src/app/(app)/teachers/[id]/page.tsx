import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityEditor } from "@/components/teachers/availability-editor";
import { updateTeacher, deleteTeacher, addAvailability, removeAvailability } from "@/lib/actions/teachers";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: teacher }, { data: availability }] = await Promise.all([
    supabase.from("teachers").select("*, profiles(full_name, email, timezone)").eq("id", id).single(),
    supabase.from("teacher_availability").select("*").eq("teacher_id", id).order("day_of_week"),
  ]);
  if (!teacher) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (teacher as any).profiles;
  const teacherTimezone = profile?.timezone ?? "UTC";

  const boundUpdate = updateTeacher.bind(null, id, teacher.profile_id);
  const boundDelete = deleteTeacher.bind(null, id, teacher.profile_id);
  const boundAdd = addAvailability.bind(null, id, `/teachers/${id}`);
  const boundRemove = async (formData: FormData) => {
    "use server";
    await removeAvailability(id, String(formData.get("availability_id")), `/teachers/${id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile?.full_name ?? "Teacher"}
        description={profile?.email ?? undefined}
        backHref="/teachers"
        backLabel="Back to Teachers"
        actions={
          <>
            <Badge tone={teacher.active ? "success" : "neutral"}>
              {teacher.active ? "Active" : "Inactive"}
            </Badge>
            <LinkButton href={`/teachers/${id}/dashboard`} variant="outline" size="sm">
              View dashboard
            </LinkButton>
            <LinkButton href={`/teachers/${id}/timetable`} variant="outline" size="sm">
              View timetable
            </LinkButton>
            <form action={boundDelete}>
              <Button type="submit" variant="danger" size="sm">
                Delete teacher
              </Button>
            </form>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={boundUpdate} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required defaultValue={profile?.full_name ?? ""} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required defaultValue={profile?.email ?? ""} />
                <p className="mt-1 text-xs text-slate-400">
                  Changing this updates their login email too.
                </p>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <TimezoneSelect name="timezone" defaultValue={profile?.timezone ?? "UTC"} required />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" rows={3} defaultValue={teacher.bio ?? ""} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourly_rate">Hourly rate</Label>
                  <Input
                    id="hourly_rate"
                    name="hourly_rate"
                    type="number"
                    step="0.01"
                    defaultValue={teacher.hourly_rate ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue={teacher.currency} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  defaultChecked={teacher.active}
                  className="h-4 w-4 rounded border-primary-300"
                />
                <Label htmlFor="active" className="mb-0">
                  Active
                </Label>
              </div>
              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly availability ({teacherTimezone})</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityEditor
              teacherTimezone={teacherTimezone}
              availability={availability ?? []}
              onAdd={boundAdd}
              onRemove={boundRemove}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
