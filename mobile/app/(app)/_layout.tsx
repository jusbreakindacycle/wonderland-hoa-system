import { Stack } from 'expo-router';

/**
 * Routes that require a valid active session (Guide §8.1).
 *
 * A simple authenticated stack with one route. No bottom tab bar: a tab bar
 * would force premature decisions about Stage 2/3/4 information architecture
 * (Guide §7.2).
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
