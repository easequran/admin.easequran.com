import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { getGoogleAuthUrl } from "@/lib/google/calendar";

export async function GET() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = getGoogleAuthUrl(profile.id);
  return NextResponse.redirect(url);
}
