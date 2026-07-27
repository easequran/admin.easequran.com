# Ease Quran

Management system for Ease Quran academy: students, teachers, timezone-aware
scheduling, trial classes, a leads CRM, attendance, and monthly fees/invoicing.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres, Auth, RLS)
- Luxon for timezone-correct scheduling

## Setup

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order (SQL editor or `supabase db push`).
3. Copy `.env.local.example` to `.env.local` and fill in your project URL, anon key,
   service role key, and a random `CRON_SECRET`.
4. Create your first admin user manually:
   - In Supabase Auth, create a user (email/password).
   - Insert a matching row into `profiles` with `role = 'admin'`.
5. `npm install`
6. `npm run dev`

## Notes on scheduling & timezones

- Every teacher and student has an IANA timezone (`profiles.timezone` /
  `students.timezone`). Teachers declare weekly availability in their own
  local time (`teacher_availability`).
- Recurring classes (`recurring_schedules`) are defined as a weekday + local
  time + anchor timezone, then materialized into concrete UTC instances
  (`class_occurrences`) via `generateOccurrencesForSchedule` — this resolves
  DST correctly because the wall-clock time is re-anchored to the IANA zone
  for each specific date, rather than storing a fixed UTC offset.
- `/api/cron/generate-occurrences` (see `vercel.json`) tops up occurrences
  nightly so schedules never run out of generated classes. Set `CRON_SECRET`
  in your Vercel project env vars.
- Every user sees class times converted to their own profile timezone.

## Roles

- **admin**: full access to everything.
- **teacher**: own students, own schedule, availability, attendance, leads assigned to them.
- **student**: own schedule, own invoices.

Teacher accounts are created by an admin via "Add teacher", which sends a
Supabase invite email.
