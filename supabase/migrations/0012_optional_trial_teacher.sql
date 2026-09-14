-- Trials can now be booked before a teacher is confirmed/added to the app.
-- teacher_id stays required in practice for recurring classes and makeup
-- classes (enforced by application code, and by the check constraint
-- below); only a trial occurrence may leave it null.

alter table class_occurrences
  alter column teacher_id drop not null;

alter table class_occurrences
  add constraint class_occurrences_teacher_required_unless_trial
  check (is_trial = true or teacher_id is not null);

-- Free-text record of a teacher who's been confirmed for a trial but isn't
-- in the app as a real teacher record yet -- shown as a reminder until the
-- trial is assigned to an actual teacher.
alter table class_occurrences
  add column pending_teacher_name text;
