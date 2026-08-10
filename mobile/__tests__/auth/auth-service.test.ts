import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import * as authService from '@/features/auth/auth-service';
import { signInWithUsername, signOut } from '@/features/auth/auth-service';
import { GENERIC_CREDENTIAL_ERROR } from '@/features/auth/auth-types';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
  registerAuthAppStateListener: jest.fn(() => () => undefined),
}));

const signInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const supabaseSignOut = supabase.auth.signOut as jest.Mock;

const PASSWORD = 'correct-horse-battery-staple';

beforeEach(() => {
  jest.clearAllMocks();
  signInWithPassword.mockResolvedValue({ data: { session: {}, user: {} }, error: null });
  supabaseSignOut.mockResolvedValue({ error: null });
});

describe('signInWithUsername', () => {
  it('passes the internal alias to Supabase, not the visible username', async () => {
    await signInWithUsername('115.sampaguita', PASSWORD);

    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: '115.sampaguita@auth.wonderland.invalid',
      password: PASSWORD,
    });

    // The resident-facing handle must never be handed to Supabase as-is.
    const call = signInWithPassword.mock.calls[0][0];
    expect(call.email).not.toBe('115.sampaguita');
  });

  it('normalises the handle before building the alias', async () => {
    await signInWithUsername('  117A.Sampaguita  ', PASSWORD);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: '117a.sampaguita@auth.wonderland.invalid',
      password: PASSWORD,
    });
  });

  it('returns ok on success', async () => {
    await expect(signInWithUsername('115.sampaguita', PASSWORD)).resolves.toEqual({
      ok: true,
    });
  });

  it('returns the single generic message when Supabase rejects the credentials', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    await expect(signInWithUsername('115.sampaguita', 'wrong')).resolves.toEqual({
      ok: false,
      message: GENERIC_CREDENTIAL_ERROR,
    });
  });

  it('returns the same message for a malformed handle, revealing nothing about existence', async () => {
    const malformed = await signInWithUsername('not a handle', PASSWORD);

    expect(malformed).toEqual({ ok: false, message: GENERIC_CREDENTIAL_ERROR });
    // A handle that cannot exist is rejected locally, so the failure is
    // indistinguishable from a wrong password and costs no round trip.
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('produces one message for every failure mode', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'User not found', status: 400 },
    });
    const unknownUser = await signInWithUsername('999.nowhere', PASSWORD);

    signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });
    const wrongPassword = await signInWithUsername('115.sampaguita', 'wrong');

    expect(unknownUser).toEqual(wrongPassword);
  });

  it('never writes the password to persistent storage', async () => {
    await signInWithUsername('115.sampaguita', PASSWORD);

    const written = [
      ...(AsyncStorage.setItem as jest.Mock).mock.calls,
      ...(SecureStore.setItemAsync as jest.Mock).mock.calls,
    ].flat();

    expect(written).not.toContain(PASSWORD);
    expect(written.some((value) => String(value).includes(PASSWORD))).toBe(false);
  });
});

describe('signOut', () => {
  it('is exposed and delegates to Supabase', async () => {
    await signOut();
    expect(supabaseSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('resident self-registration', () => {
  it('is not exported by the auth service', () => {
    // DEC-20 and Guide §10.7: the resident-facing mobile UI exposes Log In
    // only. Nothing in this module may offer account creation.
    expect(Object.keys(authService)).toEqual(
      expect.not.arrayContaining(['signUp', 'register', 'createAccount']),
    );
  });

  it('does not reach supabase.auth.signUp from anywhere in the resident UI', () => {
    // The mocked client has no `signUp` at all. If any resident-facing code
    // path grew one, these suites would fail on an undefined call rather than
    // quietly shipping a registration surface.
    expect('signUp' in supabase.auth).toBe(false);
  });
});
