// Thin wrapper over the `fn_sync_class_billing` Postgres function, which does
// the count-and-invoice loop atomically (so two classes marked at the same
// moment can't double-create a block invoice).
//
// Takes whichever Supabase client the caller already has -- the request-scoped
// server client for the attendance / "Sync now" paths, the service-role admin
// client for the nightly cron.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncClassBilling(client: any, studentId: string): Promise<number> {
  const { data, error } = await client.rpc("fn_sync_class_billing", { p_student: studentId });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? 0;
}

/** Runs a billing sync for every active per_block fee plan. Used by the cron and the manual button. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncAllClassBilling(client: any): Promise<number> {
  const { data: plans } = await client
    .from("fee_plans")
    .select("student_id")
    .eq("active", true)
    .eq("billing_mode", "per_block");

  let created = 0;
  for (const plan of plans ?? []) {
    created += await syncClassBilling(client, plan.student_id);
  }
  return created;
}
