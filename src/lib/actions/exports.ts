"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/profile";
import { buildIlikeOr } from "@/lib/utils/search";

/**
 * Read-only "export every matching row" actions for the list pages, so CSV
 * export isn't silently limited to the visible page. They run the same
 * filter as the table but without pagination. No writes, no deletes.
 */

export interface StudentExportRow {
  full_name: string;
  timezone: string | null;
  country: string | null;
  enrollment_status: string;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  created_at: string;
}

export async function exportStudentsCsv(query?: string): Promise<StudentExportRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  let sel = supabase
    .from("students")
    .select("full_name, timezone, country, enrollment_status, guardian_name, guardian_email, guardian_phone, created_at")
    .neq("enrollment_status", "trial")
    .order("created_at", { ascending: false });

  const orFilter = buildIlikeOr(query, ["full_name", "country", "guardian_name", "guardian_email"]);
  if (orFilter) sel = sel.or(orFilter);

  const { data, error } = await sel;
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentExportRow[];
}

export interface LeadExportRow {
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export async function exportLeadsCsv(query?: string): Promise<LeadExportRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  let sel = supabase
    .from("leads")
    .select("full_name, email, phone, country, source, status, notes, created_at")
    .order("created_at", { ascending: false });

  const orFilter = buildIlikeOr(query, ["full_name", "email", "phone", "country", "source"]);
  if (orFilter) sel = sel.or(orFilter);

  const { data, error } = await sel;
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadExportRow[];
}
