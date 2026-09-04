-- Per-class-block billing is collected IN ADVANCE.
--
-- Invoice #1 (block_index = 1) is raised when the plan is set up, covering the
-- first set of `classes_per_block` classes. Each subsequent set's invoice is
-- generated automatically the moment the current set's Nth *billable* class is
-- completed (billable = completed or no_show, minus excused) -- so billing is
-- always one set ahead of what's been taught. Due date is the invoice's own
-- generation date + `grace_days`.
--
-- This replaces the "in arrears" behaviour from migration 0010. The
-- `invoice_class_occurrences` link table from 0010 is now unused (an advance
-- invoice is raised before its classes exist) but is left in place rather than
-- dropped. Double-billing is prevented by comparing the plan's per_block invoice
-- count to the number of sets delivered so far.

alter table invoices add column block_index smallint;
comment on column invoices.block_index is
  'per_block invoices: 1-based sequence of this invoice within its fee plan (block 1 = the first classes_per_block classes, collected in advance).';

create or replace function fn_sync_class_billing(p_student uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan             fee_plans%rowtype;
  v_created          integer := 0;
  v_billable         integer;
  v_blocks_delivered integer;
  v_target           integer;
  v_have             integer;
begin
  -- SECURITY DEFINER (teachers marking attendance write invoices through this),
  -- but only admins/teachers and the service role (cron) may actually run it.
  if session_user not in ('service_role', 'postgres', 'supabase_admin')
     and coalesce(auth_role()::text, '') not in ('admin', 'teacher') then
    raise exception 'fn_sync_class_billing: not authorized';
  end if;

  select * into v_plan
  from fee_plans
  where student_id = p_student and active = true and billing_mode = 'per_block'
  order by created_at desc
  limit 1;

  if not found or v_plan.classes_per_block is null or v_plan.block_amount is null then
    return 0;
  end if;

  -- billable classes delivered so far, on/after the plan's cutoff date
  select count(*) into v_billable
  from class_occurrences co
  left join attendance a on a.occurrence_id = co.id
  where co.student_id = p_student
    and co.status in ('completed', 'no_show')
    and (a.status is null or a.status <> 'excused')
    and (v_plan.block_billing_since is null
         or co.start_at >= v_plan.block_billing_since::timestamptz);

  v_blocks_delivered := v_billable / v_plan.classes_per_block;  -- integer division
  v_target := v_blocks_delivered + 1;                           -- advance: always one set ahead

  select count(*) into v_have
  from invoices
  where fee_plan_id = v_plan.id and billing_mode = 'per_block';

  while v_have < v_target loop
    insert into invoices (
      student_id, fee_plan_id, period_start, period_end, amount, currency,
      status, due_date, sibling_group_id, billing_mode, classes_count, block_index
    ) values (
      p_student, v_plan.id, current_date, current_date, v_plan.block_amount, v_plan.currency,
      'pending', current_date + v_plan.grace_days, v_plan.sibling_group_id, 'per_block',
      v_plan.classes_per_block, v_have + 1
    );
    v_have := v_have + 1;
    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

revoke all on function fn_sync_class_billing(uuid) from public, anon;
grant execute on function fn_sync_class_billing(uuid) to authenticated, service_role;
