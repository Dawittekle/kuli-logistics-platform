import Constants from 'expo-constants';

type KuliRuntimeConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  googleMapsApiKey: string;
  authRedirectUrl: string;
  passwordResetRedirectUrl: string;
};

const extra = (Constants.expoConfig?.extra?.kuli ?? {}) as Partial<KuliRuntimeConfig>;
const apiBaseUrl = extra.apiBaseUrl || 'http://localhost:4000/api/v1';

export const runtimeConfig: KuliRuntimeConfig = {
  apiBaseUrl,
  supabaseUrl: extra.supabaseUrl || '',
  supabasePublishableKey: extra.supabasePublishableKey || '',
  googleMapsApiKey: extra.googleMapsApiKey || '',
  authRedirectUrl: extra.authRedirectUrl || 'kuli://auth/callback',
  passwordResetRedirectUrl: extra.passwordResetRedirectUrl || 'kuli://auth/reset-password'
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabasePublishableKey: Boolean(runtimeConfig.supabasePublishableKey),
  hasGoogleMapsApiKey: Boolean(runtimeConfig.googleMapsApiKey),
  hasAuthRedirectUrl: Boolean(runtimeConfig.authRedirectUrl),
  hasPasswordResetRedirectUrl: Boolean(runtimeConfig.passwordResetRedirectUrl)
};
