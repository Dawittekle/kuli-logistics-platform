import Constants from 'expo-constants';

type KuliRuntimeConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey: string;
  authRedirectUrl: string;
  passwordResetRedirectUrl: string;
};

const extra = (Constants.expoConfig?.extra?.kuli ?? {}) as Partial<KuliRuntimeConfig>;
const apiBaseUrl = extra.apiBaseUrl || 'http://localhost:4000/api/v1';

export const runtimeConfig: KuliRuntimeConfig = {
  apiBaseUrl,
  supabaseUrl: extra.supabaseUrl || '',
  supabaseAnonKey: extra.supabaseAnonKey || '',
  googleMapsApiKey: extra.googleMapsApiKey || '',
  authRedirectUrl: extra.authRedirectUrl || 'kuli://auth/callback',
  passwordResetRedirectUrl: extra.passwordResetRedirectUrl || 'kuli://auth/reset-password'
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabaseAnonKey: Boolean(runtimeConfig.supabaseAnonKey),
  hasGoogleMapsApiKey: Boolean(runtimeConfig.googleMapsApiKey),
  hasAuthRedirectUrl: Boolean(runtimeConfig.authRedirectUrl),
  hasPasswordResetRedirectUrl: Boolean(runtimeConfig.passwordResetRedirectUrl)
};
