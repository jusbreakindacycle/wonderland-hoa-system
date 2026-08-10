import { Stack } from 'expo-router';

/** Routes that do not require a session (Guide §8.1). */
export const unstable_settings = {
  initialRouteName: 'login',
};

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
