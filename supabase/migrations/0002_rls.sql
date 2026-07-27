-- Row Level Security policies
-- Role model: admin (full access), teacher (own students/classes), student (own data)

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from teachers where profile_id = auth.uid();
$$;

create or replace function auth_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from students where profile_id = auth.uid();
$$;

alter table profiles enable row level security;
alter table teachers enable row level security;
alter table teacher_availability enable row level security;
alter table students enable row level security;
alter table leads enable row level security;
alter table lead_activities enable row level security;
alter table recurring_schedules enable row level security;
alter table class_occurrences enable row level security;
alter table attendance enable row level security;
alter table fee_plans enable row level security;
alter table invoices enable row level security;

-- profiles
create policy "profiles: self or admin read" on profiles for select
  using (id = auth.uid() or auth_role() = 'admin');
create policy "profiles: self update" on profiles for update
  using (id = auth.uid() or auth_role() = 'admin');
create policy "profiles: admin insert" on profiles for insert
  with check (auth_role() = 'admin' or id = auth.uid());
create policy "profiles: admin delete" on profiles for delete
  using (auth_role() = 'admin');

-- teachers
create policy "teachers: admin all" on teachers for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "teachers: self read" on teachers for select
  using (profile_id = auth.uid());

-- teacher_availability
create policy "availability: admin all" on teacher_availability for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "availability: teacher manage own" on teacher_availability for all
  using (teacher_id = auth_teacher_id()) with check (teacher_id = auth_teacher_id());
create policy "availability: student read" on teacher_availability for select
  using (auth_role() = 'student');

-- students
create policy "students: admin all" on students for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "students: self read" on students for select
  using (profile_id = auth.uid());
create policy "students: teacher read own" on students for select
  using (
    auth_role() = 'teacher'
    and exists (
      select 1 from recurring_schedules rs
      where rs.student_id = students.id and rs.teacher_id = auth_teacher_id()
    )
  );

-- leads (admin/teacher CRM, students never see leads)
create policy "leads: admin all" on leads for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "leads: teacher read assigned" on leads for select
  using (auth_role() = 'teacher' and assigned_to = auth.uid());

create policy "lead_activities: admin all" on lead_activities for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "lead_activities: teacher read own lead" on lead_activities for select
  using (
    auth_role() = 'teacher'
    and exists (select 1 from leads l where l.id = lead_activities.lead_id and l.assigned_to = auth.uid())
  );

-- recurring_schedules
create policy "schedules: admin all" on recurring_schedules for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "schedules: teacher read own" on recurring_schedules for select
  using (teacher_id = auth_teacher_id());
create policy "schedules: student read own" on recurring_schedules for select
  using (student_id = auth_student_id());

-- class_occurrences
create policy "occurrences: admin all" on class_occurrences for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "occurrences: teacher read/update own" on class_occurrences for select
  using (teacher_id = auth_teacher_id());
create policy "occurrences: teacher update own" on class_occurrences for update
  using (teacher_id = auth_teacher_id()) with check (teacher_id = auth_teacher_id());
create policy "occurrences: student read own" on class_occurrences for select
  using (student_id = auth_student_id());

-- attendance
create policy "attendance: admin all" on attendance for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "attendance: teacher manage own class" on attendance for all
  using (
    exists (
      select 1 from class_occurrences co
      where co.id = attendance.occurrence_id and co.teacher_id = auth_teacher_id()
    )
  )
  with check (
    exists (
      select 1 from class_occurrences co
      where co.id = attendance.occurrence_id and co.teacher_id = auth_teacher_id()
    )
  );
create policy "attendance: student read own" on attendance for select
  using (
    exists (
      select 1 from class_occurrences co
      where co.id = attendance.occurrence_id and co.student_id = auth_student_id()
    )
  );

-- fee_plans
create policy "fee_plans: admin all" on fee_plans for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "fee_plans: student read own" on fee_plans for select
  using (student_id = auth_student_id());

-- invoices
create policy "invoices: admin all" on invoices for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "invoices: student read own" on invoices for select
  using (student_id = auth_student_id());
