import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOccurrencesForSchedule } from "@/lib/scheduling";

// Triggered on a schedule (see vercel.json) to keep occurrences generated
// several weeks ahead for every active recurring schedule.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: schedules, error } = await admin
    .from("recurring_schedules")
    .select("id")
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const schedule of schedules ?? []) {
    await generateOccurrencesForSchedule(schedule.id, admin);
  }

  return NextResponse.json({ generated: schedules?.length ?? 0 });
}
