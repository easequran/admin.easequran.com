import { getCurrentProfile } from "@/lib/data/profile";
import { getCalendarConnection } from "@/lib/google/calendar";
import { disconnectCalendarAction } from "@/lib/actions/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "next/navigation";
import { Plug } from "lucide-react";

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
      <PageHeader title="Integrations" icon={Plug} tone="info" description="Connect third-party services to the academy." />

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
              <ConfirmButton
                action={disconnectCalendarAction}
                title="Disconnect Google Calendar?"
                confirmText="Disconnect"
                confirmingText="Disconnecting…"
                successToast="Google Calendar disconnected"
                errorToast="Failed to disconnect"
                body="New class bookings, reschedules and cancellations will stop syncing to Google Calendar, and Meet links will no longer be created. Calendar events that already exist are left in place. You can reconnect any time."
              >
                Disconnect
              </ConfirmButton>
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
