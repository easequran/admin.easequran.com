# LearnSkooly Review (reference notes)

Reviewed via a 2-day trial at https://learnskooly.com/app/dashboard on 2026-08-20.
This is a third-party product someone gave us trial access to, evaluated only through
the browser UI (no code/repo access). Notes below are for comparing against our own
`admin.easequran.com` system before deciding what to borrow.

## Tech stack (observed, not confirmed from source)
- Backend: Laravel (PHP) — confirmed via `csrf-token` meta tag and route style.
- Frontend: server-rendered Bootstrap 4 + jQuery (DataTables, Owl Carousel, Google
  Charts, custom sidebar/scrollbar plugins). Not a modern SPA — no React/Vue/Next.js.
- Database: not confirmed directly (production mode, no debug/stack-trace leaks —
  custom branded "Page Unavailable" 404 page). Given Laravel, almost certainly
  MySQL/MariaDB, but unverified.
- Marketing site (learnskooly.com root) is a separate, more modern static page.

## Business model
No free/paid tier split. Marketed as a one-time purchased/licensed system
("Interested in purchasing this system?"), not a freemium SaaS. The trial exposed the
full feature set — no locked/"upgrade to unlock" features were found anywhere.

## Full feature list
- **Dashboard**: 9 stat tiles (fee amount/received/pending, salaries
  payable/paid/pending, admins/teachers/disabled) + live-refreshing "Today's Classes"
  tracker (Missed/Completed/Ongoing/Upcoming).
- **CRM** — separate login/subsystem, opens in a new tab (not embedded).
- **Demos** — trial-class demo tracking (separate module).
- **Digital Books** — PDF library upload/manage; audience targeting
  (student/teacher/both), file size, active/disabled toggle.
- **Parents** — parent list/records, linkable to students.
- **Admins** — create/list admins.
- **Teachers** — create, list, disable, bank details, per-teacher "Online Class
  Settings," profile, "Download Agreement" (contract PDF), "Switch to Teacher"
  (impersonation/login-as).
- **Students** — create, list, disable, leave-tracking list, "Switch to Student"
  impersonation, filters by admin/teacher/parent/country/class time.
- **Classes Schedule** — weekly box/list view, per-day printable schedules ("Print
  Day," "Print Schedule").
- **Today's Classes** — live status board (see Auto-refresh below).
- **Not Submitted Reports** — flags teachers who haven't submitted a class report.
- **Notice Board** — create/list notices.
- **Teacher Complaints** — create/list complaint tickets.
- **Students Fee** — month/year/status/teacher/parent filters, fee slip, pay fee,
  pay-zero-amount, dismiss, PDF export, per-student status (Pending/Fully Paid).
- **Fee Defaulter** — dedicated overdue-fee list.
- **Salary Sheet** — payable/paid/remaining totals bar, per-teacher status, edit/pay/
  dismiss, PDF export, remarks field.

## Auto-refresh feature (verified live)
The "Today's Classes" dashboard widget shows a visible countdown ("Refreshing in
00:20"). On hitting 0 it fires an AJAX request (not a full page reload — confirmed via
network log; the "Missed" counter changed live from 11 to 12) and re-renders just that
panel. Only this one widget auto-refreshes — everything else on the dashboard is
static until you navigate or reload. Implementation is a simple client-side
`setInterval` + partial AJAX swap, nothing exotic.

## Design / structure
- **Layout**: fixed dark-navy left sidebar with collapsible sub-menus, grouped icon
  shortcuts at top (home/profile/logout/edit), top-right expand/fullscreen toggle.
- **Data tables**: jQuery DataTables everywhere — built-in search, sort, pagination,
  "Show N entries" control.
- **Visual language**: pastel-tinted stat cards (blue/green/pink/orange) with icon
  badges; color-coded status pills (green = Fully Paid, yellow = Pending, red =
  Missed); consistent button color coding (blue = primary action, yellow =
  disable/warn, red = delete/dismiss, purple = impersonate).
- **Error handling**: production-hardened — custom branded "Page Unavailable" screen,
  no stack traces or debug info leaked on invalid routes.
- Overall: dated Bootstrap 4 admin-template look, no dark mode, not visually modern,
  but functionally dense and consistent — clear color language carries a lot of the
  usability.

## Comparison to admin.easequran.com

| | LearnSkooly | Our admin app |
|---|---|---|
| Stack | Laravel + jQuery, server-rendered, page reloads | Next.js 16 + Supabase, React Server Components |
| Dashboard live data | Auto-refreshing "Today's Classes" widget (AJAX poll) | Static — no auto-refresh, only updates on navigation/reload |
| Fees/Invoices | Fee slips, PDF export, zero-amount pay, defaulter list | Have `fees` + `invoices` routes — check PDF export & defaulter-style filtering |
| Salaries | Dedicated Salary Sheet with payable/paid/remaining totals + PDF | Not present — no teacher salary/payroll module yet |
| Leads/CRM | Separate bolt-on CRM (different login) | Built-in Leads CRM (`leads`, `follow-ups`, `convert`) — more integrated than theirs |
| Scheduling | Weekly box/list view, printable | `schedule` + `timetable` with Luxon DST-correct occurrence generation — more technically robust |
| Impersonation | "Switch to Teacher/Student" | Not present — could help support/debugging |
| Digital Books / Notice Board / Complaints | Present | Not present — likely not needed |

## Biggest actionable takeaways
1. Live auto-refreshing dashboard widget (visible countdown + partial AJAX/client
   refresh for "today's classes" style data).
2. "Switch to Teacher/Student" impersonation for admin support/debugging.
3. Salary/payroll management module, if teacher payouts matter for us.

## Design ideas worth borrowing
Not the visual skin (dated Bootstrap 4 look, no dark mode) — our Next.js/Tailwind UI
already looks more modern. It's these information/UX patterns that are worth adopting:

1. **Consistent status-color language.** Green = paid/good, yellow = pending/warning,
   red = missed/overdue/delete, blue = primary/neutral action, purple =
   impersonate/special. Applied identically across every module (fees, salaries,
   students, teachers) so the color code is learned once and works everywhere. Worth
   codifying as a small fixed set of Badge/Button "tone" variants — check whether
   `src/components/ui/badge.tsx` already applies this consistently across pages.

2. **Live status widgets with a visible refresh countdown.** The "Today's Classes:
   Missed/Completed/Ongoing/Upcoming" board shows "Refreshing in 00:20" — tells the
   user the data is live without a manual reload, and the visible countdown builds
   trust it isn't stale. Worth doing for our dashboard's today's-classes list and
   possibly the leads follow-ups list.

3. **Inline filter bars above every list.** Every list page (Students, Fees, Salaries,
   Schedule) repeats the same layout: dropdowns for the relevant dimensions
   (teacher/parent/status/month/year) directly above a searchable/sortable table. A
   predictable, repeatable pattern users don't have to relearn per page — worth
   standardizing as one shared `<ListFilters>` + table layout component if we don't
   already have one.

4. **PDF export as a first-class action**, not buried in a menu — "Download PDF" sits
   right next to the table title on Fees and Salaries. If admins/teachers/parents want
   printable fee slips or salary sheets, put the export button in the same prominent
   spot.

5. **Totals/summary bar directly above a financial table** — the Salaries page shows
   "Payable – Paid – Remaining" right above the list, saving a manual sum. Worth
   adding to our `fees`/`invoices` pages if they don't already show aggregate totals.

6. **"Switch to X" impersonation button** placed as a clearly-colored (purple) action
   right in the row actions, not hidden in settings — makes it fast for admins to
   debug/support without digging through menus.
