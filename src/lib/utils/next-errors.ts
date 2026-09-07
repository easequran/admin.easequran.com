/**
 * A server action invoked from a client component can throw Next's internal
 * control-flow "errors" for `redirect()` and `notFound()`. Those must be
 * re-thrown so the framework can act on them -- a try/catch around an action
 * call that swallows them would turn a successful redirect into a fake error
 * toast. Everything the app's own actions throw carries a real message.
 */
export function isNextControlFlowError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("digest" in err)) return false;
  const digest = (err as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
  );
}
