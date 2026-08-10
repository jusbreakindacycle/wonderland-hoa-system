/**
 * Public mobile configuration.
 *
 * Every value here is `EXPO_PUBLIC_*` and is therefore embedded in the shipped
 * bundle. Guide §3.6 and §17: only the project URL and a publishable client key
 * may live here. A service-role key, secret API key, database password, admin
 * access token, or Expo personal access token must never appear in this file,
 * in `mobile/.env`, in EAS public variables, or in any bundled asset.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing ${name}. Copy mobile/.env.example to mobile/.env and fill it in.`,
    );
  }
  return value.trim();
}

export const env = {
  supabaseUrl: required(
    'EXPO_PUBLIC_SUPABASE_URL',
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  supabasePublishableKey: required(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  /**
   * The non-routable domain used to carry a login handle through Supabase's
   * email-and-password credential model (Guide §10.2). It is an implementation
   * transport and is never shown to a resident.
   */
  authEmailDomain: required(
    'EXPO_PUBLIC_AUTH_EMAIL_DOMAIN',
    process.env.EXPO_PUBLIC_AUTH_EMAIL_DOMAIN,
  ),
} as const;
