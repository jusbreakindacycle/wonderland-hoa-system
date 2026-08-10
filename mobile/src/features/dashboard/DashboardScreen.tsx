import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand/BrandMark';
import { AppButton, AppCard, AppScreen, AppText } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

/**
 * The Stage 1 dashboard (Guide §12, UX Foundation §4 state 6).
 *
 * A shell, not a product dashboard. It shows the brand, the verified person's
 * name, a signed-in confirmation, and an explicit empty state.
 *
 * It deliberately contains no balance, no dues, no payment history, no
 * properties, no unit cards, no announcements, no permits, no bookings, no
 * receipts, no charts, no officer controls and no dues-generation control —
 * and it makes no financial RPC call of any kind (Guide §3.5, §12, §16).
 */
export function DashboardScreen() {
  const { profile, signOut } = useAuth();

  // The person's actual verified name appears only after authentication, never
  // as the login identifier (DEC-18).
  const displayName = profile?.full_name?.trim();

  return (
    <AppScreen variant="scroll" testID="dashboard-screen">
      <View style={styles.header}>
        <BrandMark size={64} />
        <AppText variant="title" style={styles.wordmark}>
          Wonderland HOA
        </AppText>
      </View>

      <AppText variant="display" style={styles.greeting}>
        {displayName ? displayName : 'You’re signed in.'}
      </AppText>

      {displayName ? (
        <AppText variant="body" color="textSecondary" style={styles.confirmation}>
          You’re signed in.
        </AppText>
      ) : null}

      <AppCard style={styles.card} testID="dashboard-empty-state">
        <AppText variant="body" color="textSecondary">
          Mobile foundation ready. Property, dues, payment and community modules
          will be connected in later stages.
        </AppText>
      </AppCard>

      <AppButton
        label="Sign Out"
        variant="secondary"
        onPress={() => void signOut()}
        testID="dashboard-sign-out"
      />

      <AppText variant="caption" color="textSecondary" style={styles.version}>
        {`Version ${Constants.expoConfig?.version ?? '—'}`}
      </AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    marginBottom: spacing.space32,
  },
  wordmark: {
    flexShrink: 1,
  },
  greeting: {
    marginBottom: spacing.space4,
  },
  confirmation: {
    marginBottom: spacing.space24,
  },
  card: {
    marginBottom: spacing.space32,
  },
  version: {
    marginTop: spacing.space24,
    textAlign: 'center',
  },
});
