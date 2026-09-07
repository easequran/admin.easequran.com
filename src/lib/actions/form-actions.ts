"use server";

import { isNextControlFlowError } from "@/lib/utils/next-errors";
import type { ActionState } from "@/lib/types/action-state";
import { createStudent, updateStudent } from "@/lib/actions/students";
import { createTeacher, updateTeacher } from "@/lib/actions/teachers";
import { createLead, updateLead } from "@/lib/actions/leads";
import { bookTrialClass } from "@/lib/actions/schedule";

/**
 * `useActionState`-shaped wrappers for the create/edit forms. Each just
 * runs the real action; a thrown validation/DB error becomes `{ error }`
 * (so the form keeps the user's input), while Next's redirect/notFound
 * control-flow errors are re-thrown so success navigation still happens.
 * The underlying actions -- their inserts, updates and redirects -- are
 * completely unchanged.
 */

function toState(err: unknown): ActionState {
  if (isNextControlFlowError(err)) throw err;
  return { error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
}

export async function createStudentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createStudent(formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function updateStudentAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateStudent(studentId, formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function createTeacherAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createTeacher(formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function updateTeacherAction(
  teacherId: string,
  profileId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateTeacher(teacherId, profileId, formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function createLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createLead(formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function updateLeadAction(
  leadId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateLead(leadId, formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function bookTrialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await bookTrialClass(formData);
    return {};
  } catch (err) {
    return toState(err);
  }
}
