/**
 * Jest setup for the mobile test suite.
 *
 * The public environment variables are set here so `src/lib/env.ts` can be
 * imported under test without a real `mobile/.env`. These are fixtures, not
 * credentials — no real key, and certainly no secret key, belongs in a test.
 */
// React 19 only permits `act(...)` when this flag is set. jest-expo's preset
// does not set it, and without it every asynchronous state update in the auth
// provider logs an act warning and races the assertions.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
process.env.EXPO_PUBLIC_AUTH_EMAIL_DOMAIN = 'auth.wonderland.invalid';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async () => undefined),
    getItem: jest.fn(async () => null),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));
