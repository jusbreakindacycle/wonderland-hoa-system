import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase/client';
import { GENERIC_CREDENTIAL_ERROR, type SignInResult } from './auth-types';
import { normalizeUsername, usernameToInternalAuthEmail } from './username';

/**
 * Resident authentication.
 *
 * Sign-in only. There is deliberately no `signUp` export anywhere in the
 * mobile application: residents do not self-register, the HOA provisions the
 * account and issues the credentials (DEC-20, Guide §10.4, §10.7).
 *
 * Nothing in this module logs the password, the Supabase access or refresh
 * token, or the internal auth alias (Guide §10.5).
 */

/**
 * Sign in with the HOA-issued login handle.
 *
 * The handle is normalised, converted to the internal auth email transport,
 * and only that transport is handed to Supabase. The resident never sees the
 * alias (Guide §10.2).
 *
 * Every failure — malformed handle, unknown handle, wrong password — returns
 * the same message, so the UI cannot be used to discover whether an account
 * exists (Guide §10.6).
 */
export async function signInWithUsername(
  username: string,
  password: string,
): Promise<SignInResult> {
  const normalized = normalizeUsername(username);
  if (!normalized.ok) {
    return { ok: false, message: GENERIC_CREDENTIAL_ERROR };
  }

  const email = usernameToInternalAuthEmail(normalized.value, env.authEmailDomain);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: GENERIC_CREDENTIAL_ERROR };
  }

  // The password is not returned, not stored, and not retained in module
  // state. Only the session Supabase issued is persisted, by the encrypted
  // storage adapter (Guide §11.3, §17).
  return { ok: true };
}

export async function signOut(): Promise<void> {
  // Supabase's sign-out clears the persisted session through the same storage
  // adapter that wrote it, which removes both the ciphertext and its
  // SecureStore key (Guide §11.9).
  await supabase.auth.signOut();
}
