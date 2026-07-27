-- Structured lead follow-up tracking: when a lead was last contacted, what
-- happened, and when to follow up next.

alter table leads
  add column last_contacted_at timestamptz,
  add column next_follow_up_at timestamptz;

create index idx_leads_next_follow_up on leads (next_follow_up_at);

-- What kind of contact attempt this was, and how it went.
alter table lead_activities
  add column outcome text;

create index idx_leads_status_follow_up on leads (status, next_follow_up_at);
