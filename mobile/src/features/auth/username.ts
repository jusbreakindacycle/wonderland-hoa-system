/**
 * Login-handle normalisation and internal-alias construction.
 *
 * Both functions are pure so they can be tested without a Supabase client
 * (Guide §10.5).
 *
 * DEC-18 fixes the resident-facing credential as a *login handle* — HOA-issued
 * and, for homeowners, derived from one currently owned property. Canonical
 * form is `house_no.street_name`, e.g. `115.sampaguita`, `117a.sampaguita`.
 *
 * Stage 1 scope, per DEC-18 and Guide §10.2: this module only *accepts and
 * normalises* an already-issued handle. It does not derive one from a property
 * record — `street` does not exist as a column yet and that derivation is
 * Stage 2 work.
 */

/**
 * The approved character set. Lowercase alphanumeric segments separated by
 * single dots, with no leading, trailing, or doubled dot.
 *
 * This also rejects `@`, which is what makes double-appending the internal auth
 * domain unreachable rather than merely guarded against (Guide §10.5 item 5).
 */
export const USERNAME_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/;

export type NormalizeUsernameResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'blank' | 'invalid_characters' };

/**
 * Trim, lowercase, and validate a resident-entered login handle.
 *
 * Rejection reasons are for the *caller's* branching only. The resident sees a
 * single generic message; this function never produces UI copy (Guide §10.6).
 */
export function normalizeUsername(input: string): NormalizeUsernameResult {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === '') {
    return { ok: false, reason: 'blank' };
  }

  if (!USERNAME_PATTERN.test(trimmed)) {
    return { ok: false, reason: 'invalid_characters' };
  }

  return { ok: true, value: trimmed };
}

/**
 * Convert a normalised login handle into the internal Supabase Auth email
 * transport, e.g. `115.sampaguita` → `115.sampaguita@auth.wonderland.invalid`.
 *
 * The result is an implementation detail. It must never be displayed as the
 * resident-facing login identifier (Guide §10.2), and must never be logged
 * (§10.5).
 *
 * Throws on an un-normalised handle rather than silently repairing it, so a
 * caller that skips `normalizeUsername` fails loudly in development instead of
 * producing a subtly wrong alias.
 */
export function usernameToInternalAuthEmail(handle: string, domain: string): string {
  const normalizedDomain = domain.trim().toLowerCase().replace(/^@/, '');

  if (normalizedDomain === '') {
    throw new Error('usernameToInternalAuthEmail: auth email domain is empty.');
  }

  const suffix = `@${normalizedDomain}`;
  const candidate = handle.trim().toLowerCase();

  // Defence in depth. USERNAME_PATTERN already rejects '@', so a normalised
  // handle can never arrive already suffixed — but the guard is explicit and
  // tested so the invariant cannot regress silently if the pattern changes.
  const bare = candidate.endsWith(suffix)
    ? candidate.slice(0, -suffix.length)
    : candidate;

  const normalized = normalizeUsername(bare);
  if (!normalized.ok) {
    throw new Error('usernameToInternalAuthEmail: handle is not a valid login handle.');
  }

  return `${normalized.value}${suffix}`;
}
