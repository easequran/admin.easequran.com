-- Teachers could mark attendance for a trial class (via class_occurrences,
-- teacher_id = auth_teacher_id()) but the join to show the student/lead's
-- name on the Attendance page silently returned null: the existing RLS
-- policies only grant a teacher read access to a student through an
-- existing recurring_schedules row, and to a lead only when assigned_to
-- them directly. A one-off trial (no recurring schedule, no assignment)
-- fell through both, showing "Unknown" instead of the actual name.

create policy "students: teacher read via occurrence" on students for select
  using (
    exists (
      select 1 from class_occurrences co
      where co.student_id = students.id and co.teacher_id = auth_teacher_id()
    )
  );

create policy "leads: teacher read via occurrence" on leads for select
  using (
    exists (
      select 1 from class_occurrences co
      where co.lead_id = leads.id and co.teacher_id = auth_teacher_id()
    )
  );
