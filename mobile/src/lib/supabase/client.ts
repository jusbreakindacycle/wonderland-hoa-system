import { AppState, type AppStateStatus } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { LargeSecureStore } from './secure-storage';

/**
 * The single Supabase client for the mobile application.
 *
 * One client, one auth subscription, one AppState listener — Guide §18 lists
 * duplicates of any of these as performance violations, and duplicate clients
 * also produce duplicate token refreshes.
 *
 * Only the project URL and the publishable key reach this file. No
 * service-role key, ever (Guide §3.6, §17).
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    storage: new LargeSecureStore(),
    persistSession: true,
    autoRefreshToken: true,
    // React Native has no URL to read a session out of, and leaving this on
    // makes the client wait on a browser API that never resolves.
    detectSessionInUrl: false,
  },
});

let appStateSubscription: { remove: () => void } | null = null;

function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
}

/**
 * Register app lifecycle handling exactly once, so auto-refresh runs while the
 * app is foregrounded and stops while it is backgrounded (Guide §11.4).
 *
 * Called from the root layout rather than at module scope so the behaviour is
 * explicit and testable, and idempotent so a Fast Refresh or a remount cannot
 * stack listeners.
 */
export function registerAuthAppStateListener(): () => void {
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    if (AppState.currentState === 'active') {
      void supabase.auth.startAutoRefresh();
    }
  }

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    void supabase.auth.stopAutoRefresh();
  };
}
