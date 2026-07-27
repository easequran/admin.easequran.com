import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForConnection } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state"); // profile id of the admin who connected

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=Missing+authorization+code", request.url),
    );
  }

  try {
    await exchangeCodeForConnection(code, state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect Google Calendar";
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL("/settings/integrations?connected=1", request.url));
}
