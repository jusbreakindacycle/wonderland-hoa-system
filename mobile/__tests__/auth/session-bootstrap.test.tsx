import { Text } from 'react-native';
import { act, render, waitFor, type RenderResult } from '@testing-library/react-native';

import { activeProfile, createSupabaseMock, type SupabaseMock } from '../support/supabase-mock';

let mock: SupabaseMock;

jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return mock.supabase;
  },
  registerAuthAppStateListener: jest.fn(() => () => undefined),
}));

// Imported after the mock is registered.
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

function AuthProbe() {
  const { status, profile, retry, signOut } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="name">{profile?.full_name ?? ''}</Text>
      <Text testID="retry" onPress={() => void retry()}>
        retry
      </Text>
      <Text testID="signout" onPress={() => signOut()}>
        sign out
      </Text>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

const statusOf = (view: RenderResult) => view.getByTestId('status').props.children;

beforeEach(() => {
  mock = createSupabaseMock();
});

describe('boot sequence', () => {
  it('no session -> signed out, which routes to login', async () => {
    mock.givenNoSession();
    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('signedOut'));
  });

  it('valid session + active profile -> signed in, which routes to the dashboard', async () => {
    mock.givenSession(activeProfile());
    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('signedIn'));
    expect(view.getByTestId('name').props.children).toBe('Luz Garcia');
  });

  it('valid session + missing profile -> account unavailable, not the dashboard', async () => {
    mock.givenSession(null);
    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('accountUnavailable'));
  });

  it('valid session + inactive profile -> account unavailable', async () => {
    mock.givenSession(activeProfile({ is_active: false }));
    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('accountUnavailable'));
  });

  it('does not leave booting until the profile has been verified', async () => {
    // Hold the profile read open. Until it resolves the app must stay in
    // `booting` — the splash gate — and must never expose a protected state on
    // the strength of a stored session alone (Guide §8.2, §11.6).
    let release!: () => void;
    mock.state.holdProfile = new Promise<void>((resolve) => {
      release = resolve;
    });
    mock.givenSession(activeProfile());

    const view = renderProvider();

    // Let the session and user reads land while the profile read is held.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(statusOf(view)).toBe('booting');

    await act(async () => {
      release();
    });
    await waitFor(() => expect(statusOf(view)).toBe('signedIn'));
  });
});

describe('recoverable failures', () => {
  it('a transport failure while verifying does not sign the user out', async () => {
    mock.givenSession(activeProfile());
    mock.state.userError = { name: 'AuthRetryableFetchError', message: 'Network request failed' };

    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('recoverableError'));
    // Scenario F: local auth state must survive a temporary loss of
    // connectivity rather than being discarded.
    expect(mock.supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('a rejected session does sign the user out', async () => {
    mock.givenSession(activeProfile());
    mock.state.userError = { status: 401, message: 'invalid JWT' };

    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('signedOut'));
  });

  it('a failed profile read is recoverable, not account-unavailable', async () => {
    mock.givenSession(activeProfile());
    mock.state.profileError = { message: 'Network request failed' };

    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('recoverableError'));
  });

  it('retry re-runs the boot sequence and can succeed', async () => {
    mock.givenSession(activeProfile());
    mock.state.profileError = { message: 'Network request failed' };

    const view = renderProvider();
    await waitFor(() => expect(statusOf(view)).toBe('recoverableError'));

    mock.state.profileError = null;
    await act(async () => {
      view.getByTestId('retry').props.onPress();
    });

    await waitFor(() => expect(statusOf(view)).toBe('signedIn'));
  });
});

describe('sign out', () => {
  it('returns to signed out and clears the profile', async () => {
    mock.givenSession(activeProfile());
    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('signedIn'));

    await act(async () => {
      await view.getByTestId('signout').props.onPress();
    });

    expect(statusOf(view)).toBe('signedOut');
    expect(view.getByTestId('name').props.children).toBe('');
    expect(mock.supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('reacts to a SIGNED_OUT event raised elsewhere', async () => {
    mock.givenSession(activeProfile());
    const view = renderProvider();
    await waitFor(() => expect(statusOf(view)).toBe('signedIn'));

    mock.givenNoSession();
    await act(async () => {
      mock.emit('SIGNED_OUT');
    });

    expect(statusOf(view)).toBe('signedOut');
  });
});

describe('auth event subscription', () => {
  it('subscribes once and unsubscribes on unmount', async () => {
    mock.givenNoSession();
    const view = renderProvider();

    await waitFor(() => expect(statusOf(view)).toBe('signedOut'));
    expect(mock.supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mock.listenerCount()).toBe(1);

    view.unmount();

    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mock.listenerCount()).toBe(0);
  });

  it('re-resolves the session after a token refresh', async () => {
    mock.givenSession(activeProfile());
    const view = renderProvider();
    await waitFor(() => expect(statusOf(view)).toBe('signedIn'));

    const before = mock.maybeSingle.mock.calls.length;
    await act(async () => {
      mock.emit('TOKEN_REFRESHED');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(mock.maybeSingle.mock.calls.length).toBeGreaterThan(before));
    expect(statusOf(view)).toBe('signedIn');
  });
});
