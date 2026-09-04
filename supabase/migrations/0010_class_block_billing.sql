-- Class-block billing: as an alternative to the calendar-month fee plan, a
-- student can be billed once every N *billable* classes (a "block"). A class
-- counts toward a block once it is `completed` or `no_show` (an absent student
-- is still billed) -- an `excused` class does not count (it gets rescheduled
-- instead). When the Nth billable class is reached, an invoice for the block
-- is generated automatically, due `grace_days` after that last class.
--
-- Monthly billing is untouched: every existing fee_plan stays `billing_mode =
-- 'monthly'` and keeps using monthly_amount / billing_day. A plan only starts
-- counting classes after an admin switches it to 'per_block', and only counts
-- classes on/after `block_billing_since` (set to the switch date) so past
-- classes are never retro-billed.

-- ============================================================
-- fee_plans: per-plan billing mode + block settings
-- ============================================================
alter table fee_plans
  add column billing_mode text not null default 'monthly'
    check (billing_mode in ('monthly', 'per_block')),
  add column classes_per_block smallint
    check (classes_per_block is null or classes_per_block between 1 and 60),
  add column block_amount numeric(10, 2)
    check (block_amount is null or block_amount > 0),
  add column grace_days smallint not null default 3
    check (grace_days between 0 and 60),
  add column block_billing_since date;

-- monthly_amount is no longer required for every plan: block plans price by
-- block_amount instead.
alter table fee_plans alter column monthly_amount drop not null;

-- Each plan must be fully specified for whichever mode it is in.
alter table fee_plans add constraint fee_plans_mode_fields_ck check (
  (billing_mode = 'monthly' and monthly_amount is not null)
  or
  (billing_mode = 'per_block' and classes_per_block is not null and block_amount is not null)
);

comment on column fee_plans.billing_mode is
  'monthly = one invoice per calendar month (monthly_amount on billing_day). per_block = one invoice every classes_per_block billable classes, priced at block_amount, due grace_days after the block''s last class.';
comment on column fee_plans.block_billing_since is
  'per_block only: only classes on/after this date count toward blocks. Set to the switch date so classes taught under the old monthly plan are never retro-billed.';

-- ============================================================
-- invoices: how the invoice was generated + how many classes it covers
-- ============================================================
alter table invoices
  add column billing_mode text not null default 'monthly'
    check (billing_mode in ('monthly', 'per_block')),
  add column classes_count smallint;

comment on column invoices.classes_count is
  'per_block invoices: number of classes this invoice covers (= fee_plan.classes_per_block at generation time). Null for monthly invoices.';

-- ============================================================
-- invoice_class_occurrences: the exact classes a block invoice covers.
-- unique(occurrence_id) makes double-billing a class impossible at the DB level.
-- ============================================================
create table invoice_class_occurrences (
  invoice_id uuid not null references invoices (id) on delete cascade,
  occurrence_id uuid not null references class_occurrences (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (invoice_id, occurrence_id),
  unique (occurrence_id)
);

create index idx_invoice_class_occurrences_invoice on invoice_class_occurrences (invoice_id);

alter table invoice_class_occurrences enable row level security;

create policy "invoice_class_occurrences: admin all" on invoice_class_occurrences for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "invoice_class_occurrences: student read own" on invoice_class_occurrences for select
  using (
    exists (
      select 1 from invoices i
      where i.id = invoice_class_occurrences.invoice_id and i.student_id = auth_student_id()
    )
  );

-- ============================================================
-- fn_sync_class_billing: generate any block invoices now due for one student.
-- Idempotent -- safe to call after every attendance mark and from the nightly
-- cron. Returns the number of invoices created this call.
--
-- security definer: it is triggered by teachers marking attendance, who have
-- no direct insert rights on `invoices` under RLS.
-- ============================================================
create or replace function fn_sync_class_billing(p_student uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       fee_plans%rowtype;
  v_created    integer := 0;
  v_batch      uuid[];
  v_first_date date;
  v_last_date  date;
  v_invoice_id uuid;
  v_occ        uuid;
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

  loop
    -- the oldest classes_per_block billable, not-yet-invoiced classes
    select array_agg(sub.id order by sub.start_at)
      into v_batch
    from (
      select co.id, co.start_at
      from class_occurrences co
      left join attendance a on a.occurrence_id = co.id
      where co.student_id = p_student
        and co.status in ('completed', 'no_show')
        and (a.status is null or a.status <> 'excused')
        and (
          v_plan.block_billing_since is null
          or co.start_at >= v_plan.block_billing_since::timestamptz
        )
        and not exists (
          select 1 from invoice_class_occurrences ico where ico.occurrence_id = co.id
        )
      order by co.start_at
      limit v_plan.classes_per_block
    ) sub;

    if v_batch is null or array_length(v_batch, 1) < v_plan.classes_per_block then
      exit;
    end if;

    select min(co.start_at)::date, max(co.start_at)::date
      into v_first_date, v_last_date
    from class_occurrences co
    where co.id = any (v_batch);

    insert into invoices (
      student_id, fee_plan_id, period_start, period_end, amount, currency,
      status, due_date, sibling_group_id, billing_mode, classes_count
    ) values (
      p_student, v_plan.id, v_first_date, v_last_date, v_plan.block_amount, v_plan.currency,
      'pending', v_last_date + v_plan.grace_days, v_plan.sibling_group_id, 'per_block', v_plan.classes_per_block
    )
    returning id into v_invoice_id;

    foreach v_occ in array v_batch loop
      insert into invoice_class_occurrences (invoice_id, occurrence_id)
      values (v_invoice_id, v_occ);
    end loop;

    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

revoke all on function fn_sync_class_billing(uuid) from public, anon;
grant execute on function fn_sync_class_billing(uuid) to authenticated, service_role;
