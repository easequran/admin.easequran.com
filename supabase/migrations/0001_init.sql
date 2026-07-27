-- Ease Quran academy management system
-- Core schema: profiles, students, teachers, availability, scheduling,
-- trials, leads CRM, attendance, fees & invoices.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum ('admin', 'teacher', 'student');
create type enrollment_status as enum ('trial', 'active', 'paused', 'inactive');
create type occurrence_status as enum ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');
create type lead_status as enum ('new', 'contacted', 'trial_scheduled', 'trial_completed', 'converted', 'lost');
create type invoice_status as enum ('pending', 'paid', 'overdue', 'cancelled');

-- ============================================================
-- profiles: one row per authenticated user (admin/teacher/student)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  email text,
  phone text,
  -- IANA timezone, e.g. 'Asia/Karachi', 'America/New_York'
  timezone text not null default 'UTC',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- teachers
-- ============================================================
create table teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  bio text,
  hourly_rate numeric(10, 2),
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- weekly recurring availability, stored in the teacher's local time.
-- day_of_week: 0 = Sunday .. 6 = Saturday, local to `timezone`.
create table teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  local_start_time time not null,
  local_end_time time not null check (local_end_time > local_start_time),
  timezone text not null,
  created_at timestamptz not null default now()
);

create index idx_teacher_availability_teacher on teacher_availability (teacher_id);

-- ============================================================
-- students
-- ============================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles (id) on delete set null,
  full_name text not null,
  timezone text not null default 'UTC',
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  country text,
  enrollment_status enrollment_status not null default 'trial',
  notes text,
  lead_id uuid, -- backfilled once leads table exists (fk added below)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- leads CRM
-- ============================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  country text,
  timezone text default 'UTC',
  source text, -- e.g. 'facebook', 'referral', 'website'
  status lead_status not null default 'new',
  assigned_to uuid references profiles (id) on delete set null,
  notes text,
  converted_student_id uuid references students (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table students
  add constraint students_lead_id_fkey foreign key (lead_id) references leads (id) on delete set null;

create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  activity_type text not null, -- 'note', 'call', 'email', 'status_change'
  content text,
  created_at timestamptz not null default now()
);

create index idx_lead_activities_lead on lead_activities (lead_id);

-- ============================================================
-- recurring class schedules
-- ============================================================
create table recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  teacher_id uuid not null references teachers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  -- local start time + reference timezone the recurrence is anchored to
  -- (occurrences are generated in UTC honoring DST at generation time)
  local_start_time time not null,
  timezone text not null,
  duration_minutes smallint not null check (duration_minutes in (30, 60)),
  active boolean not null default true,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now()
);

create index idx_recurring_schedules_student on recurring_schedules (student_id);
create index idx_recurring_schedules_teacher on recurring_schedules (teacher_id);

-- ============================================================
-- class occurrences: materialized instances (incl. trials & one-offs)
-- ============================================================
create table class_occurrences (
  id uuid primary key default gen_random_uuid(),
  recurring_schedule_id uuid references recurring_schedules (id) on delete set null,
  student_id uuid references students (id) on delete cascade,
  teacher_id uuid not null references teachers (id) on delete cascade,
  lead_id uuid references leads (id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  is_trial boolean not null default false,
  status occurrence_status not null default 'scheduled',
  meeting_link text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_class_occurrences_teacher on class_occurrences (teacher_id, start_at);
create index idx_class_occurrences_student on class_occurrences (student_id, start_at);
create index idx_class_occurrences_start on class_occurrences (start_at);

-- ============================================================
-- attendance (one row per occurrence, since classes are 1:1)
-- ============================================================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null unique references class_occurrences (id) on delete cascade,
  status attendance_status not null,
  marked_by uuid references profiles (id) on delete set null,
  marked_at timestamptz not null default now(),
  notes text
);

-- ============================================================
-- fees & invoicing
-- ============================================================
create table fee_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  monthly_amount numeric(10, 2) not null,
  currency text not null default 'USD',
  billing_day smallint not null default 1 check (billing_day between 1 and 28),
  classes_per_week smallint not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  fee_plan_id uuid references fee_plans (id) on delete set null,
  period_start date not null,
  period_end date not null,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  status invoice_status not null default 'pending',
  due_date date not null,
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_invoices_student on invoices (student_id);
create index idx_invoices_status on invoices (status);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_students_updated_at before update on students
  for each row execute function set_updated_at();
create trigger trg_leads_updated_at before update on leads
  for each row execute function set_updated_at();
