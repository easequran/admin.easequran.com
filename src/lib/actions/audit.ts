"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: string | null;
  created_at: string;
}

/**
 * Records an audit trail entry. Deliberately swallows its own errors --
 * a logging failure should never block the real action (a delete, a
 * status change) that's already happened.
 */
export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: string | null;
}) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentProfile();
    await supabase.from("audit_log").insert({
      actor_id: profile.id,
      actor_name: profile.full_name,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      details: params.details ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log entry", err);
  }
}

export async function getAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditLogEntry[] | null) ?? [];
}
