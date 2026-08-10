/**
 * A controllable stand-in for the mobile Supabase client.
 *
 * Only the surface the Stage 1 auth provider actually uses is modelled:
 * `getSession`, `getUser`, `onAuthStateChange`, `signInWithPassword`,
 * `signOut`, and a single-row `profiles` select.
 */
export type AuthChangeEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'INITIAL_SESSION';

type Listener = (event: AuthChangeEvent) => void;

export type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  position_label: string | null;
  is_active: boolean | null;
};

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

type AuthCallResult = {
  data: { session: { user: { id: string } } | null; user: { id: string } | null };
  error: { message?: string; status?: number; name?: string } | null;
};

export function createSupabaseMock() {
  const state = {
    session: null as { user: { id: string } } | null,
    user: null as { id: string } | null,
    userError: null as { name?: string; status?: number; message?: string } | null,
    sessionError: null as { message?: string } | null,
    profile: null as ProfileRow | null,
    profileError: null as { message?: string } | null,
    /** Resolves the profile read only when released, to observe the pre-resolution state. */
    holdProfile: null as null | Promise<void>,
  };

  const listeners = new Set<Listener>();
  const unsubscribe = jest.fn();

  const maybeSingle = jest.fn(async () => {
    if (state.holdProfile) await state.holdProfile;
    if (state.profileError) return { data: null, error: state.profileError };
    return { data: state.profile, error: null };
  });

  const supabase = {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: state.session },
        error: state.sessionError,
      })),
      getUser: jest.fn(async () => ({
        data: { user: state.userError ? null : state.user },
        error: state.userError,
      })),
      onAuthStateChange: jest.fn((callback: Listener) => {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
                unsubscribe();
              },
            },
          },
        };
      }),
      // Loosely typed so a test can hand back an error shape without fighting
      // the inferred success-only return type.
      signInWithPassword: jest.fn(async (): Promise<AuthCallResult> => ({
        data: { session: state.session, user: state.user },
        error: null,
      })),
      signOut: jest.fn(async () => ({ error: null })),
      startAutoRefresh: jest.fn(async () => undefined),
      stopAutoRefresh: jest.fn(async () => undefined),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle })),
      })),
    })),
  };

  return {
    supabase,
    state,
    unsubscribe,
    maybeSingle,
    emit(event: AuthChangeEvent) {
      listeners.forEach((listener) => listener(event));
    },
    listenerCount: () => listeners.size,

    /** Signed out: no persisted session. */
    givenNoSession() {
      state.session = null;
      state.user = null;
      state.profile = null;
    },
    /** A restored, server-valid session for a user with the given profile. */
    givenSession(profile: ProfileRow | null) {
      const id = profile?.id ?? 'user-without-profile';
      state.session = { user: { id } };
      state.user = { id };
      state.profile = profile;
    },
  };
}

export function activeProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'resident-uuid',
    full_name: 'Luz Garcia',
    role: 'resident',
    position_label: null,
    is_active: true,
    ...overrides,
  };
}
