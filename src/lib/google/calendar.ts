import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getGoogleAuthUrl(state?: string) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForConnection(code: string, connectedBy: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error("Google did not return a refresh token. Try disconnecting and reconnecting with prompt=consent.");
  }

  client.setCredentials(tokens);

  let connectedEmail: string | null = null;
  try {
    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: userInfo } = await oauth2.userinfo.get();
    connectedEmail = userInfo.email ?? null;
  } catch (err) {
    // Non-fatal: the connection still works without a display email.
    console.error("Failed to fetch Google account email", err);
  }

  const admin = createAdminClient();
  // Only one connection at a time for the academy calendar.
  await admin.from("calendar_connections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await admin.from("calendar_connections").insert({
    provider: "google",
    connected_email: connectedEmail,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: new Date(tokens.expiry_date).toISOString(),
    connected_by: connectedBy,
  });
  if (error) throw new Error(error.message);
}

export async function disconnectGoogleCalendar() {
  const admin = createAdminClient();
  await admin.from("calendar_connections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

export async function getCalendarConnection() {
  const admin = createAdminClient();
  const { data } = await admin.from("calendar_connections").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

/** Returns an authorized Calendar API client, or null if the academy hasn't connected Google Calendar. */
async function getAuthorizedCalendar() {
  const admin = createAdminClient();
  const connection = await getCalendarConnection();
  if (!connection) return null;

  const client = oauthClient();
  client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expiry).getTime(),
  });

  client.on("tokens", async (tokens) => {
    const update: Record<string, string> = {};
    if (tokens.access_token) update.access_token = tokens.access_token;
    if (tokens.expiry_date) update.token_expiry = new Date(tokens.expiry_date).toISOString();
    if (Object.keys(update).length > 0) {
      await admin.from("calendar_connections").update(update).eq("id", connection.id);
    }
  });

  return google.calendar({ version: "v3", auth: client });
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startAtUtcIso: string;
  endAtUtcIso: string;
  attendeeEmails: string[];
}

/** Creates a Calendar event and returns its id, or null if Google Calendar isn't connected. */
export async function createCalendarEvent(input: CalendarEventInput): Promise<string | null> {
  const calendar = await getAuthorizedCalendar();
  if (!calendar) return null;

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startAtUtcIso, timeZone: "UTC" },
      end: { dateTime: input.endAtUtcIso, timeZone: "UTC" },
      attendees: input.attendeeEmails.filter(Boolean).map((email) => ({ email })),
    },
  });

  return data.id ?? null;
}

export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEventInput>,
): Promise<void> {
  const calendar = await getAuthorizedCalendar();
  if (!calendar) return;

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    requestBody: {
      ...(updates.summary && { summary: updates.summary }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.startAtUtcIso && { start: { dateTime: updates.startAtUtcIso, timeZone: "UTC" } }),
      ...(updates.endAtUtcIso && { end: { dateTime: updates.endAtUtcIso, timeZone: "UTC" } }),
      ...(updates.attendeeEmails && {
        attendees: updates.attendeeEmails.filter(Boolean).map((email) => ({ email })),
      }),
    },
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = await getAuthorizedCalendar();
  if (!calendar) return;

  try {
    await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
  } catch {
    // Event may already be deleted on Google's side — nothing more to do.
  }
}
