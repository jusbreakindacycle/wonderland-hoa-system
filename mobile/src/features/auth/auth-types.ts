/**
 * Authentication types shared by the auth service and the auth provider.
 */

/**
 * The Stage 1 auth state machine, fixed by Guide §11.5.
 *
 * Explicit states, not several unrelated booleans, so "restoring a session"
 * can never be confused with "signed out" and a protected screen cannot be
 * rendered during bootstrap.
 */
export type AuthStatus =
  | 'booting'
  | 'signedOut'
  | 'signingIn'
  | 'signedIn'
  | 'accountUnavailable'
  | 'recoverableError';

/**
 * The only profile fields Stage 1 reads (Guide §11.8).
 *
 * No username, street, occupancy, household, ownership or tenant field — those
 * are Stage 2 and the columns do not exist.
 */
export type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  position_label: string | null;
  is_active: boolean | null;
};

export const PROFILE_COLUMNS = 'id, full_name, role, position_label, is_active' as const;

/**
 * The single resident-facing authentication failure message.
 *
 * One message for every credential failure, so the UI never reveals whether a
 * login handle exists (Guide §10.6, §17).
 */
export const GENERIC_CREDENTIAL_ERROR = 'Invalid username or password.';

/**
 * Shown when authentication succeeded but the account cannot be used —
 * no profile row, a profile the resident cannot read, or `is_active` false
 * (Guide §11.8, UX Foundation §4 state 4).
 */
export const ACCOUNT_UNAVAILABLE_MESSAGE =
  "Your account isn't active yet. Contact the HOA office to activate it.";

/**
 * Shown when the app cannot reach Supabase to verify a session it already has.
 * The stored session is deliberately left intact (Guide §11.6, UX Foundation
 * §4 state 5).
 */
export const RECOVERABLE_ERROR_MESSAGE =
  "Can't reach the HOA server right now. Check your connection and try again.";

export type SignInResult = { ok: true } | { ok: false; message: string };
