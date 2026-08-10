import { StyleSheet, View } from 'react-native';

import { AppButton, AppScreen, AppText, InlineAlert } from '@/components/ui';
import { RECOVERABLE_ERROR_MESSAGE } from '@/features/auth/auth-types';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

/**
 * Shown when the app holds a session it could not verify — typically no
 * network during boot (UX Foundation §4 state 5, acceptance Scenario F).
 *
 * The stored session is deliberately left intact. Guide §11.6: do not blindly
 * delete a possibly valid session because connectivity is temporarily
 * unavailable.
 */
export function RecoverableErrorScreen() {
  const { retry, signOut } = useAuth();

  return (
    <AppScreen centerContent testID="recoverable-error-screen">
      <InlineAlert variant="warning" message={RECOVERABLE_ERROR_MESSAGE} />

      <View style={styles.body}>
        <AppText variant="body" color="textSecondary">
          Your sign-in is still saved on this device. Nothing has been lost.
        </AppText>
      </View>

      <AppButton label="Retry" onPress={() => void retry()} testID="recoverable-retry" />

      <View style={styles.secondary}>
        <AppButton label="Sign Out" variant="tertiary" onPress={() => void signOut()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.space16,
    marginBottom: spacing.space32,
  },
  secondary: {
    marginTop: spacing.space12,
  },
});
