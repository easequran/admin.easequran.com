import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvailabilityEditor } from "@/components/teachers/availability-editor";
import { updateTeacher, addAvailability, removeAvailability } from "@/lib/actions/teachers";
import { notFound } from "next/navigation";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*, profiles(full_name, email, timezone)")
    .eq("id", id)
    .single();
  if (!teacher) notFound();

  const { data: availability } = await supabase
    .from("teacher_availability")
    .select("*")
    .eq("teacher_id", id)
    .order("day_of_week");

  const boundUpdate = updateTeacher.bind(null, id);
  const boundAdd = addAvailability.bind(null, id);
  const boundRemove = async (formData: FormData) => {
    "use server";
    await removeAvailability(id, String(formData.get("availability_id")));
  };

  const profile = teacher.profiles;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-900">{profile?.full_name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={boundUpdate} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={profile?.timezone ?? ""} disabled />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" rows={3} defaultValue={teacher.bio ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly availability ({profile?.timezone})</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityEditor
              teacherTimezone={profile?.timezone ?? "UTC"}
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
