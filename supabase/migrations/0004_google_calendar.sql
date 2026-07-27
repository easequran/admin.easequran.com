-- Google Calendar integration: one stored OAuth connection for the academy's
-- calendar, plus a link from each class occurrence to its Calendar event.

create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google',
  connected_email text,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamptz not null,
  connected_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calendar_connections enable row level security;

create policy "calendar_connections: admin all" on calendar_connections for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

alter table class_occurrences
  add column calendar_event_id text;

create trigger trg_calendar_connections_updated_at before update on calendar_connections
  for each row execute function set_updated_at();
