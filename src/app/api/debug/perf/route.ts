import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Temporary diagnostic endpoint to isolate where request latency comes
// from (auth revalidation vs. profile query vs. a plain data query vs.
// cold-start). Remove once the performance investigation is done.
export async function GET() {
  const timings: Record<string, number> = {};
  const t0 = performance.now();

  const supabase = await createClient();
  timings.createClient = performance.now() - t0;

  const t1 = performance.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  timings.getSession = performance.now() - t1;

  const t2 = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  timings.getUser = performance.now() - t2;

  let profileTime = 0;
  let queryTime = 0;
  if (user) {
    const t3 = performance.now();
    await supabase.from("profiles").select("*").eq("id", user.id).single();
    profileTime = performance.now() - t3;

    const t4 = performance.now();
    await supabase.from("students").select("id").limit(1);
    queryTime = performance.now() - t4;
  }
  timings.profileQuery = profileTime;
  timings.sampleQuery = queryTime;
  timings.total = performance.now() - t0;
  timings.hasSession = session ? 1 : 0;

  return NextResponse.json(timings);
}
