import { LoginForm } from '@/features/auth/components/LoginForm';

/**
 * Route files stay thin: they decide which screen renders and nothing else
 * (Guide §7.1). No authentication logic, no Supabase query, no design token.
 */
export default function LoginRoute() {
  return <LoginForm />;
}
