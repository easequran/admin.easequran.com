import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { disconnectGoogleCalendar } from "@/lib/google/calendar";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await disconnectGoogleCalendar();
  return NextResponse.redirect(new URL("/settings/integrations", request.url));
}
