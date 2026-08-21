import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForConnection } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state"); // profile id of the admin who connected

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=Missing+authorization+code", request.url),
    );
  }

  // `state` is just a query param an attacker could hand-craft alongside a
  // leaked/replayed `code` -- tie it to the browser's actual signed-in
  // session instead of trusting it on its own, so the connection can only
  // ever be attributed to whoever is currently logged in as that admin.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user || session.user.id !== state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=Invalid+or+expired+authorization+request", request.url),
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
