-- Partner finance tracking: income actually received, business expenses, and
-- partner draws, all in PKR -- separate from the USD/GBP/etc. student fee
-- plans in Fees/Invoices, since what lands in the academy's bank account is
-- a converted PKR amount that doesn't map 1:1 to any single invoice.

create table finance_income (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table finance_expenses (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  note text,
  paid_by text not null check (paid_by in ('umair', 'shah_zaib')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table finance_draws (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  amount numeric(12, 2) not null check (amount > 0),
  partner text not null check (partner in ('umair', 'shah_zaib')),
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table finance_income enable row level security;
alter table finance_expenses enable row level security;
alter table finance_draws enable row level security;

create policy "finance_income: admin all" on finance_income for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "finance_expenses: admin all" on finance_expenses for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "finance_draws: admin all" on finance_draws for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
