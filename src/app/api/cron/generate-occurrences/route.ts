import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOccurrencesForSchedule } from "@/lib/scheduling";
import { markOverdueInvoices } from "@/lib/actions/invoices";
import { syncAllClassBilling } from "@/lib/billing/sync-class-billing";

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

  // Safety net for class-block billing: catch any block that filled up via a
  // path that didn't run the sync (e.g. an occurrence status changed directly).
  const blockInvoices = await syncAllClassBilling(admin);

  await markOverdueInvoices(admin);

  return NextResponse.json({ generated: schedules?.length ?? 0, blockInvoices });
}
