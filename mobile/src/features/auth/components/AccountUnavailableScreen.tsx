import { StyleSheet, View } from 'react-native';

import { AppButton, AppScreen, AppText, InlineAlert } from '@/components/ui';
import { ACCOUNT_UNAVAILABLE_MESSAGE } from '@/features/auth/auth-types';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

/**
 * Shown when Supabase authenticated the credentials but the account has no
 * usable active profile (UX Foundation §4 state 4, Guide §11.8).
 *
 * The protected dashboard is never rendered in this state — access is not
 * inferred from Auth alone.
 *
 * `warning`, not `danger`: this is not the resident's fault and is not a
 * definitive failure (UX Foundation §4, semantic convention).
 */
export function AccountUnavailableScreen() {
  const { signOut } = useAuth();

  return (
    <AppScreen centerContent testID="account-unavailable-screen">
      <InlineAlert variant="warning" message={ACCOUNT_UNAVAILABLE_MESSAGE} />

      <View style={styles.body}>
        <AppText variant="body" color="textSecondary">
          Your sign-in worked, but the HOA has not finished setting up your
          resident record. The office can activate it for you.
        </AppText>
      </View>

      <AppButton label="Sign Out" variant="secondary" onPress={() => void signOut()} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.space16,
    marginBottom: spacing.space32,
  },
});
