import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { BrandMark } from '@/components/brand/BrandMark';
import {
  AppButton,
  AppScreen,
  AppText,
  AppTextField,
  InlineAlert,
} from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

const HANDLE_HELPER = 'This is the login ID issued by the HOA — not your name.';
const HANDLE_REQUIRED = 'Enter the username the HOA issued you.';
const PASSWORD_REQUIRED = 'Enter your password.';

/**
 * The Stage 1 login screen (UX Foundation §4 state 3).
 *
 * Log In only. There is no Sign Up, Register, or Create Account affordance:
 * the HOA provisions resident accounts (DEC-20, Guide §10.4, §10.7).
 */
export function LoginForm() {
  const { status, signInError, signIn, clearSignInError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submitting = status === 'signingIn';

  const handleSubmit = async () => {
    const missingUsername = username.trim() === '';
    const missingPassword = password === '';

    setUsernameError(missingUsername ? HANDLE_REQUIRED : null);
    setPasswordError(missingPassword ? PASSWORD_REQUIRED : null);

    // Focus moves to the first invalid field after a failed submission
    // (UX Foundation §7).
    if (missingUsername) {
      usernameRef.current?.focus();
      return;
    }
    if (missingPassword) {
      passwordRef.current?.focus();
      return;
    }

    await signIn(username, password);
  };

  return (
    <AppScreen variant="scroll" centerContent testID="login-screen">
      <View style={styles.header}>
        <BrandMark size={120} />
        <AppText variant="display" style={styles.wordmark}>
          Wonderland HOA
        </AppText>
      </View>

      <AppText variant="title" style={styles.title}>
        Log In
      </AppText>

      {signInError ? (
        <View style={styles.alert}>
          <InlineAlert variant="danger" message={signInError} testID="login-error" />
        </View>
      ) : null}

      <View style={styles.fields}>
        <AppTextField
          ref={usernameRef}
          label="Username"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (usernameError) setUsernameError(null);
            if (signInError) clearSignInError();
          }}
          // A login handle has no '@', so the email keyboard would be wrong.
          // Handles are always lowercase per DEC-18.
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="e.g. 115.sampaguita"
          helperText={HANDLE_HELPER}
          errorText={usernameError ?? undefined}
          editable={!submitting}
          testID="login-username"
        />

        <AppTextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) setPasswordError(null);
            if (signInError) clearSignInError();
          }}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
          errorText={passwordError ?? undefined}
          editable={!submitting}
          testID="login-password"
        />
      </View>

      <AppButton
        label="Log In"
        size="lg"
        onPress={() => void handleSubmit()}
        loading={submitting}
        testID="login-submit"
      />

      <AppText variant="caption" color="textSecondary" style={styles.recovery}>
        Forgot your password? Contact the HOA office to have it reset.
      </AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.space32,
  },
  wordmark: {
    marginTop: spacing.space16,
    textAlign: 'center',
  },
  title: {
    marginBottom: spacing.space16,
  },
  alert: {
    marginBottom: spacing.space16,
  },
  fields: {
    gap: spacing.space16,
    marginBottom: spacing.space32,
  },
  recovery: {
    marginTop: spacing.space24,
    textAlign: 'center',
  },
});
