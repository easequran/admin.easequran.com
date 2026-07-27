// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Once the project is linked, replace with `supabase gen types typescript`.

export type UserRole = "admin" | "teacher" | "student";
export type EnrollmentStatus = "trial" | "active" | "paused" | "inactive";
export type OccurrenceStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type LeadStatus =
  | "new"
  | "contacted"
  | "trial_scheduled"
  | "trial_completed"
  | "converted"
  | "lost";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  profile_id: string;
  bio: string | null;
  hourly_rate: number | null;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface TeacherAvailability {
  id: string;
  teacher_id: string;
  day_of_week: number;
  local_start_time: string;
  local_end_time: string;
  timezone: string;
  created_at: string;
}

export interface Student {
  id: string;
  profile_id: string | null;
  full_name: string;
  timezone: string;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  country: string | null;
  enrollment_status: EnrollmentStatus;
  notes: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  source: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  converted_student_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  created_by: string | null;
  activity_type: string;
  content: string | null;
  created_at: string;
}

export interface RecurringSchedule {
  id: string;
  student_id: string;
  teacher_id: string;
  day_of_week: number;
  local_start_time: string;
  timezone: string;
  duration_minutes: 30 | 60;
  active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface ClassOccurrence {
  id: string;
  recurring_schedule_id: string | null;
  student_id: string | null;
  teacher_id: string;
  lead_id: string | null;
  start_at: string;
  end_at: string;
  is_trial: boolean;
  status: OccurrenceStatus;
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  occurrence_id: string;
  status: AttendanceStatus;
  marked_by: string | null;
  marked_at: string;
  notes: string | null;
}

export interface FeePlan {
  id: string;
  student_id: string;
  monthly_amount: number;
  currency: string;
  billing_day: number;
  classes_per_week: number;
  active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  fee_plan_id: string | null;
  period_start: string;
  period_end: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

// Minimal Database shape so @supabase/ssr generics are happy.
// Not a full generated type — fields are typed via the interfaces above
// in application code instead of via Database['public']['Tables'].
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
