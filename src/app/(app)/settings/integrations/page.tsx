import { getCurrentProfile } from "@/lib/data/profile";
import { getCalendarConnection } from "@/lib/google/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const connection = await getCalendarConnection();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-900">Integrations</h1>

      {params.connected && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Google Calendar connected successfully.
        </p>
      )}
      {params.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection ? (
            <>
              <p className="text-sm text-primary-900">
                Connected as <span className="font-medium">{connection.connected_email}</span>
              </p>
              <p className="text-sm text-slate-500">
                Class bookings, reschedules, and cancellations automatically sync to this Google
                Calendar, with the teacher and student added as attendees.
              </p>
              <form action="/api/google/disconnect" method="POST">
                <Button type="submit" variant="danger" size="sm">
                  Disconnect
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Not connected. Connect a Google account to automatically create Calendar invites
                (with Meet links) whenever a class or trial is scheduled.
              </p>
              <LinkButton href="/api/google/connect" variant="accent">
                Connect Google Calendar
              </LinkButton>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
