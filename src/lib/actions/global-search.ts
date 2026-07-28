"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";

export interface SearchResultItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface SearchResultGroup {
  group: string;
  items: SearchResultItem[];
}

const LIMIT = 5;

/**
 * Global "mega search" across every entity the caller's role can see.
 * Uses the request-scoped Supabase client (not the admin client) so RLS is
 * the actual safety net -- the role branching below only decides which
 * queries are worth firing, it isn't itself the security boundary.
 */
export async function globalSearch(rawQuery: string): Promise<SearchResultGroup[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const like = `%${query}%`;

  if (profile.role === "admin") {
    const [{ data: leads }, { data: students }, { data: teachers }, { data: trials }, { data: invoices }] = await Promise.all([
      supabase
        .from("leads")
        .select("id, full_name, email, phone")
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(LIMIT),
      supabase
        .from("students")
        .select("id, full_name, guardian_name, guardian_email")
        .or(`full_name.ilike.${like},guardian_name.ilike.${like},guardian_email.ilike.${like}`)
        .limit(LIMIT),
      supabase
        .from("teachers")
        .select("id, profiles!inner(full_name, email)")
        .or(`full_name.ilike.${like},email.ilike.${like}`, { foreignTable: "profiles" })
        .limit(LIMIT),
      supabase
        .from("class_occurrences")
        .select("id, start_at, students(full_name), leads(full_name)")
        .eq("is_trial", true)
        .or(`full_name.ilike.${like}`, { foreignTable: "students" })
        .limit(LIMIT),
      supabase
        .from("invoices")
        .select("id, amount, currency, status, students!inner(full_name)")
        .or(`full_name.ilike.${like}`, { foreignTable: "students" })
        .limit(LIMIT),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherRows = (teachers ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trialRows = (trials ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceRows = (invoices ?? []) as any[];

    return [
      {
        group: "Leads",
        items: (leads ?? []).map((l) => ({ id: l.id, label: l.full_name, sublabel: l.email ?? l.phone ?? undefined, href: `/leads/${l.id}` })),
      },
      {
        group: "Students",
        items: (students ?? []).map((s) => ({ id: s.id, label: s.full_name, sublabel: s.guardian_name ?? s.guardian_email ?? undefined, href: `/students/${s.id}` })),
      },
      {
        group: "Teachers",
        items: teacherRows
          .filter((t) => t.profiles?.full_name)
          .map((t) => ({ id: t.id, label: t.profiles.full_name, sublabel: t.profiles.email ?? undefined, href: `/teachers/${t.id}` })),
      },
      {
        group: "Trial classes",
        items: trialRows.map((t) => ({
          id: t.id,
          label: t.students?.full_name ?? t.leads?.full_name ?? "Trial",
          sublabel: new Date(t.start_at).toLocaleString(),
          href: `/trials/${t.id}`,
        })),
      },
      {
        group: "Invoices",
        items: invoiceRows.map((inv) => ({
          id: inv.id,
          label: inv.students?.full_name ?? "Invoice",
          sublabel: `${inv.currency} ${Number(inv.amount).toFixed(2)} · ${inv.status}`,
          href: `/invoices`,
        })),
      },
    ].filter((g) => g.items.length > 0);
  }

  if (profile.role === "teacher") {
    const { data: teacherRow } = await supabase.from("teachers").select("id").eq("profile_id", profile.id).single();
    if (!teacherRow) return [];

    const { data: classes } = await supabase
      .from("class_occurrences")
      .select("id, start_at, is_trial, students(full_name), leads(full_name)")
      .eq("teacher_id", teacherRow.id)
      .or(`full_name.ilike.${like}`, { foreignTable: "students" })
      .order("start_at", { ascending: false })
      .limit(LIMIT);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classRows = (classes ?? []) as any[];

    return [
      {
        group: "Classes",
        items: classRows.map((c) => ({
          id: c.id,
          label: c.students?.full_name ?? c.leads?.full_name ?? "Trial",
          sublabel: new Date(c.start_at).toLocaleString(),
          href: "/schedule",
        })),
      },
    ].filter((g) => g.items.length > 0);
  }

  // student
  const { data: studentRow } = await supabase.from("students").select("id").eq("profile_id", profile.id).single();
  if (!studentRow) return [];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, currency, status")
    .eq("student_id", studentRow.id)
    .ilike("status", like)
    .limit(LIMIT);

  return [
    {
      group: "Invoices",
      items: (invoices ?? []).map((inv) => ({
        id: inv.id,
        label: `${inv.currency} ${Number(inv.amount).toFixed(2)}`,
        sublabel: inv.status,
        href: "/invoices",
      })),
    },
  ].filter((g) => g.items.length > 0);
}
