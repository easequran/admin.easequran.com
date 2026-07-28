-- Simple audit trail for admin actions (status changes, deletions, bulk
-- operations) -- useful once more than one admin uses the portal.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  actor_name text,
  action text not null, -- e.g. 'lead.deleted', 'lead.status_changed', 'student.bulk_status_changed'
  entity_type text not null, -- 'lead' | 'student' | 'teacher'
  entity_id uuid,
  entity_label text, -- the entity's name at the time, kept even if it's later deleted
  details text,
  created_at timestamptz not null default now()
);

create index idx_audit_log_created_at on audit_log (created_at desc);

alter table audit_log enable row level security;

create policy "audit_log: admin all" on audit_log for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
