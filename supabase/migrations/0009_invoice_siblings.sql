-- Durable sibling linkage: when an admin creates one fee plan per selected
-- student in a single submission (the existing "siblings" checkbox flow),
-- tag every resulting row with the same sibling_group_id so their invoices
-- can always be found and combined into one PDF later.

alter table fee_plans add column sibling_group_id uuid;
alter table invoices add column sibling_group_id uuid;

create index idx_invoices_sibling_group_period on invoices (sibling_group_id, period_start)
  where sibling_group_id is not null;
create index idx_fee_plans_sibling_group on fee_plans (sibling_group_id)
  where sibling_group_id is not null;

comment on column fee_plans.sibling_group_id is
  'Shared uuid across all fee_plans rows created together for a group of siblings in one createFeePlan submission. Null for single-student plans. Generated in the server action, not a DB default, because it must be identical across the batch insert.';
comment on column invoices.sibling_group_id is
  'Copied from fee_plans.sibling_group_id at invoice-generation time. Used to group same-period sibling invoices into one combined PDF.';
