/**
 * The one keyboard-focus treatment for custom interactive elements that
 * aren't the shared <Button> (which already carries its own). Matches
 * Button's ring: 2px primary outline, offset so it clears rounded corners.
 * Pair with `outline-none` on the element to replace the UA default.
 */
export const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400";
