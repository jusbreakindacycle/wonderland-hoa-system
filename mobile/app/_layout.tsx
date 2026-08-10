// Polyfills must load before anything touches the Supabase client.
// `react-native-get-random-values` provides crypto.getRandomValues for the
// encrypted session store; the URL polyfill is required by supabase-js on
// React Native.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/ui';
import { AccountUnavailableScreen } from '@/features/auth/components/AccountUnavailableScreen';
import { RecoverableErrorScreen } from '@/features/auth/components/RecoverableErrorScreen';
import { registerAuthAppStateListener } from '@/lib/supabase/client';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

// Hold the native splash until authentication bootstrap has decided where the
// user belongs (Guide §8.2).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* Dark icons on the light `background` canvas. The bar's own colour
            is set by `app.json`'s backgroundColor under Android edge-to-edge. */}
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  // One AppState listener for the whole app, registered once (Guide §11.4).
  useEffect(() => registerAuthAppStateListener(), []);

  useEffect(() => {
    if (status !== 'booting') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  // The JS loading screen is visually identical to the native splash, so the
  // handoff between them is invisible and neither the login screen nor the
  // dashboard is ever flashed before the session is resolved (Guide §8.2).
  if (status === 'booting') {
    return <LoadingScreen />;
  }

  if (status === 'recoverableError') {
    return <RecoverableErrorScreen />;
  }

  if (status === 'accountUnavailable') {
    return <AccountUnavailableScreen />;
  }

  const isSignedIn = status === 'signedIn';

  // `Stack.Protected` removes the disallowed group from the navigation state
  // entirely, rather than redirecting out of it after the fact. An
  // unauthenticated user therefore has no protected route to reach, and after
  // sign-out Android back cannot re-enter the dashboard (Guide §8.3, §11.9;
  // acceptance Scenario E).
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
