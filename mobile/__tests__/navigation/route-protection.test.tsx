import { act, waitFor } from '@testing-library/react-native';
import { renderRouter, testRouter } from 'expo-router/testing-library';

import { activeProfile, createSupabaseMock, type SupabaseMock } from '../support/supabase-mock';

let mock: SupabaseMock;

jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return mock.supabase;
  },
  registerAuthAppStateListener: jest.fn(() => () => undefined),
}));

/**
 * Route protection, exercised through the real `mobile/app` tree.
 *
 * `Stack.Protected` removes the disallowed group from the navigation state
 * rather than redirecting away from it after render, so these assertions are
 * about which routes *exist*, not about which redirect fired.
 */
beforeEach(() => {
  mock = createSupabaseMock();
});

/** Mounts the real `mobile/app` route tree, resolved from the project root. */
function renderApp(initialUrl: string) {
  return renderRouter('app', { initialUrl });
}

describe('unauthenticated access', () => {
  it('cannot open a protected route — the app lands on login instead', async () => {
    mock.givenNoSession();
    const view = renderApp('/');

    await waitFor(() => expect(view.getByTestId('login-screen')).toBeTruthy());
    expect(view.queryByTestId('dashboard-screen')).toBeNull();
  });

  it('cannot reach the dashboard by navigating straight to its URL', async () => {
    mock.givenNoSession();
    const view = renderApp('/(app)');

    await waitFor(() => expect(view.getByTestId('login-screen')).toBeTruthy());
    expect(view.queryByTestId('dashboard-screen')).toBeNull();
  });
});

describe('authenticated access', () => {
  it('does not remain on the login route once signed in', async () => {
    mock.givenSession(activeProfile());
    const view = renderApp('/login');

    await waitFor(() => expect(view.getByTestId('dashboard-screen')).toBeTruthy());
    expect(view.queryByTestId('login-screen')).toBeNull();
  });
});

describe('sign out', () => {
  it('prevents navigating back into the protected group', async () => {
    mock.givenSession(activeProfile());
    const view = renderApp('/');

    await waitFor(() => expect(view.getByTestId('dashboard-screen')).toBeTruthy());

    mock.givenNoSession();
    await act(async () => {
      mock.emit('SIGNED_OUT');
    });

    await waitFor(() => expect(view.getByTestId('login-screen')).toBeTruthy());
    expect(view.queryByTestId('dashboard-screen')).toBeNull();

    // The protected group is no longer part of the navigation state, so there
    // is nothing behind login for Android back to return to
    // (acceptance Scenario E).
    expect(testRouter.canGoBack()).toBe(false);
    expect(JSON.stringify(view.getRouterState())).not.toContain('(app)');
  });
});

describe('non-navigable auth states', () => {
  it('renders account-unavailable instead of any route when the profile is inactive', async () => {
    mock.givenSession(activeProfile({ is_active: false }));
    const view = renderApp('/');

    await waitFor(() => expect(view.getByTestId('account-unavailable-screen')).toBeTruthy());
    expect(view.queryByTestId('dashboard-screen')).toBeNull();
    expect(view.queryByTestId('login-screen')).toBeNull();
  });

  it('renders the recoverable state without dropping into login', async () => {
    mock.givenSession(activeProfile());
    mock.state.userError = { name: 'AuthRetryableFetchError', message: 'Network request failed' };
    const view = renderApp('/');

    await waitFor(() => expect(view.getByTestId('recoverable-error-screen')).toBeTruthy());
    expect(view.queryByTestId('login-screen')).toBeNull();
    expect(view.queryByTestId('dashboard-screen')).toBeNull();
  });
});
