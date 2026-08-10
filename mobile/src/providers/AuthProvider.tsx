import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase/client';
import {
  GENERIC_CREDENTIAL_ERROR,
  PROFILE_COLUMNS,
  type AuthStatus,
  type Profile,
} from '@/features/auth/auth-types';
import { signInWithUsername, signOut as signOutService } from '@/features/auth/auth-service';

type AuthContextValue = {
  status: AuthStatus;
  profile: Profile | null;
  /** The generic credential message, set only after a failed sign-in attempt. */
  signInError: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-runs the boot sequence after a `recoverableError`. */
  retry: () => Promise<void>;
  clearSignInError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Stage 1 authentication state.
 *
 * Implements the state machine in Guide §11.5 and the boot sequence in §11.6.
 * A small React context is deliberate: Guide §15.5 rules out adding a
 * state-management library for state this size.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Monotonic token so a slow resolve cannot overwrite the result of a newer
  // one — e.g. a boot-time profile read landing after a sign-out.
  const runIdRef = useRef(0);

  const resolveSession = useCallback(async (): Promise<void> => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;

    // 1. Read the persisted session through the encrypted storage adapter.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (isStale()) return;

    if (sessionError) {
      // Reading local storage failed. Do not destroy it — that is exactly the
      // case Guide §11.6 warns against.
      setStatus('recoverableError');
      return;
    }

    if (!sessionData.session) {
      setProfile(null);
      setStatus('signedOut');
      return;
    }

    // 2. Validate the session against the server rather than trusting the
    //    stored copy.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (isStale()) return;

    if (userError) {
      // Distinguish "this session is genuinely rejected" from "we could not
      // ask". Only the former means signed out; the latter must not delete a
      // possibly-valid session (Guide §11.6, acceptance Scenario F).
      if (isSessionRejected(userError)) {
        setProfile(null);
        setStatus('signedOut');
      } else {
        setStatus('recoverableError');
      }
      return;
    }

    const user = userData.user;
    if (!user) {
      setProfile(null);
      setStatus('signedOut');
      return;
    }

    // 3. Load the profile. Authentication alone never grants access
    //    (Guide §11.8).
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();
    if (isStale()) return;

    if (profileError) {
      // A transport or database failure is not evidence that the account is
      // unusable, so this is retryable rather than terminal.
      setStatus('recoverableError');
      return;
    }

    // A missing row and an RLS-filtered row are indistinguishable here, and
    // both mean the same thing to the resident: the account cannot be used.
    if (!profileData || profileData.is_active !== true) {
      setProfile(null);
      setStatus('accountUnavailable');
      return;
    }

    setProfile(profileData as Profile);
    setStatus('signedIn');
  }, []);

  // Boot once, then keep in step with Supabase's own auth events.
  useEffect(() => {
    // Deferred off the effect body rather than called inline. The boot
    // sequence is asynchronous and its first state write happens well after
    // the first `await`, but starting it from a callback keeps that obvious to
    // both readers and the React Compiler's effect analysis. The splash stays
    // up across this tick because `status` is still `booting`.
    const bootstrap = setTimeout(() => {
      void resolveSession();
    }, 0);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        runIdRef.current += 1;
        setProfile(null);
        setStatus('signedOut');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Supabase documents that calling other client methods synchronously
        // inside this callback can deadlock, so the resolve is deferred off
        // the callback frame.
        setTimeout(() => {
          void resolveSession();
        }, 0);
      }
    });

    return () => {
      clearTimeout(bootstrap);
      data.subscription.unsubscribe();
    };
  }, [resolveSession]);

  const signIn = useCallback(
    async (username: string, password: string): Promise<void> => {
      setSignInError(null);
      setStatus('signingIn');

      const result = await signInWithUsername(username, password);

      if (!result.ok) {
        setSignInError(result.message || GENERIC_CREDENTIAL_ERROR);
        setStatus('signedOut');
        return;
      }

      // The SIGNED_IN event also triggers a resolve; `runIdRef` makes the
      // later of the two authoritative and discards the other.
      await resolveSession();
    },
    [resolveSession],
  );

  const signOut = useCallback(async (): Promise<void> => {
    runIdRef.current += 1;
    await signOutService();
    setProfile(null);
    setSignInError(null);
    setStatus('signedOut');
  }, []);

  const retry = useCallback(async (): Promise<void> => {
    setStatus('booting');
    await resolveSession();
  }, [resolveSession]);

  const clearSignInError = useCallback(() => setSignInError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, profile, signInError, signIn, signOut, retry, clearSignInError }),
    [status, profile, signInError, signIn, signOut, retry, clearSignInError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}

/**
 * True when Supabase has told us the session itself is no longer valid, as
 * opposed to telling us nothing because the request never completed.
 */
function isSessionRejected(error: { status?: number; name?: string }): boolean {
  if (error.name === 'AuthRetryableFetchError') {
    return false;
  }
  return error.status === 401 || error.status === 403;
}
