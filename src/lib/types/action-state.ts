/** Return shape for form server actions wired through `useActionState`.
 * `error` (when set) is shown inline and the form is NOT navigated away
 * from, so the user's typed values survive a failed submit. Success paths
 * keep doing their own `redirect(...)`. */
export type ActionState = { error?: string };

export const EMPTY_ACTION_STATE: ActionState = {};
