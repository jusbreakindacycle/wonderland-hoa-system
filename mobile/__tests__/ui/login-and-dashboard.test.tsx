import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { activeProfile, createSupabaseMock, type SupabaseMock } from '../support/supabase-mock';

let mock: SupabaseMock;

jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return mock.supabase;
  },
  registerAuthAppStateListener: jest.fn(() => () => undefined),
}));

import { GENERIC_CREDENTIAL_ERROR } from '@/features/auth/auth-types';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { AuthProvider } from '@/providers/AuthProvider';

function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  mock = createSupabaseMock();
});

describe('login screen', () => {
  beforeEach(async () => {
    mock.givenNoSession();
    renderWithAuth(<LoginForm />);
    await waitFor(() => expect(screen.getByTestId('login-screen')).toBeTruthy());
  });

  it('asks for a Username, not an email address', () => {
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByText(/email/i)).toBeNull();
  });

  it('gives both fields an accessible label', () => {
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('uses secure text entry for the password field', () => {
    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(true);
  });

  it('has an accessibly labelled password-visibility toggle', () => {
    const toggle = screen.getByLabelText('Show password');
    fireEvent.press(toggle);

    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Hide password')).toBeTruthy();
  });

  it('configures the handle field for a login handle, not an email', () => {
    const field = screen.getByTestId('login-username');
    expect(field.props.autoCapitalize).toBe('none');
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.keyboardType).toBe('default');
    expect(field.props.placeholder).toBe('e.g. 115.sampaguita');
  });

  it('offers no self-registration affordance', () => {
    expect(screen.queryByText(/sign up/i)).toBeNull();
    expect(screen.queryByText(/register/i)).toBeNull();
    expect(screen.queryByText(/create account/i)).toBeNull();
  });

  it('points at the HOA for password recovery', () => {
    expect(screen.getByText(/contact the hoa office/i)).toBeTruthy();
  });
});

describe('login submission', () => {
  it('renders the generic error accessibly and reveals nothing about the account', async () => {
    mock.givenNoSession();
    mock.supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    renderWithAuth(<LoginForm />);
    await waitFor(() => expect(screen.getByTestId('login-screen')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('login-username'), '115.sampaguita');
    fireEvent.changeText(screen.getByTestId('login-password'), 'wrong');
    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });

    const alert = await screen.findByTestId('login-error');
    expect(screen.getByText(GENERIC_CREDENTIAL_ERROR)).toBeTruthy();
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
  });

  it('disables the submit control while a sign-in is in flight', async () => {
    mock.givenNoSession();

    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    mock.supabase.auth.signInWithPassword.mockImplementation(async () => {
      await held;
      return { data: { session: null, user: null }, error: { message: 'nope', status: 400 } };
    });

    renderWithAuth(<LoginForm />);
    await waitFor(() => expect(screen.getByTestId('login-screen')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('login-username'), '115.sampaguita');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret');

    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
      // Allow microtasks to complete
      await Promise.resolve();
      await Promise.resolve();
    });

    // Now check the props — the component has re-rendered with loading state
    const submit = screen.getByTestId('login-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);
    expect(submit.props.accessibilityState.busy).toBe(true);

    // A second tap while busy must not fire another attempt.
    fireEvent.press(submit);
    expect(mock.supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
    });
  });

  it('does not call Supabase when a required field is empty', async () => {
    mock.givenNoSession();
    renderWithAuth(<LoginForm />);
    await waitFor(() => expect(screen.getByTestId('login-screen')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });

    expect(mock.supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the username the HOA issued you.')).toBeTruthy();
  });
});

describe('dashboard', () => {
  beforeEach(async () => {
    mock.givenSession(activeProfile());
    renderWithAuth(<DashboardScreen />);
    await waitFor(() => expect(screen.getByTestId('dashboard-screen')).toBeTruthy());
  });

  it('renders without any domain data', () => {
    expect(screen.getByTestId('dashboard-empty-state')).toBeTruthy();
    expect(
      screen.getByText(
        'Mobile foundation ready. Property, dues, payment and community modules will be connected in later stages.',
      ),
    ).toBeTruthy();
  });

  it('shows the verified person name, never a login handle', () => {
    expect(screen.getByText('Luz Garcia')).toBeTruthy();
    expect(screen.queryByText(/sampaguita/i)).toBeNull();
    expect(screen.queryByText(/auth\.wonderland\.invalid/)).toBeNull();
  });

  it('shows no invented figure of any kind', () => {
    // Guide §12: no total balance, no unpaid dues, no payment history, no
    // charts. The empty-state sentence deliberately names those modules as
    // *deferred*, so the assertion is about numbers and amounts, not about the
    // words appearing anywhere on screen.
    for (const forbidden of [/₱/, /\bPHP\b/, /\d[\d,]*\.\d{2}\b/]) {
      expect(screen.queryByText(forbidden)).toBeNull();
    }
  });

  it('exposes no control other than sign out', () => {
    // No officer controls, no dues-generation trigger, no payment action.
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('Sign Out');
  });

  it('does not promise a release date for deferred modules', () => {
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('offers sign out', () => {
    expect(screen.getByTestId('dashboard-sign-out')).toBeTruthy();
  });
});
