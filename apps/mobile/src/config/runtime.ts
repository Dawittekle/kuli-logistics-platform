import Constants from 'expo-constants';

type KuliRuntimeConfig = {
  appVariant: string;
  isDriver: boolean;
  apiBaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  googleMapsApiKey: string;
  authRedirectUrl: string;
  passwordResetRedirectUrl: string;
};

const extra = (Constants.expoConfig?.extra?.kuli ?? {}) as Partial<KuliRuntimeConfig>;
const apiBaseUrl = extra.apiBaseUrl || 'http://localhost:4000/api/v1';
const appVariant = extra.appVariant || 'customer';

export const runtimeConfig: KuliRuntimeConfig = {
  appVariant,
  isDriver: appVariant === 'driver',
  apiBaseUrl,
  supabaseUrl: extra.supabaseUrl || '',
  supabasePublishableKey: extra.supabasePublishableKey || '',
  googleMapsApiKey: extra.googleMapsApiKey || '',
  authRedirectUrl: extra.authRedirectUrl || (appVariant === 'driver' ? 'kuli-driver://auth/callback' : 'kuli://auth/callback'),
  passwordResetRedirectUrl: extra.passwordResetRedirectUrl || (appVariant === 'driver' ? 'kuli-driver://auth/reset-password' : 'kuli://auth/reset-password')
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabasePublishableKey: Boolean(runtimeConfig.supabasePublishableKey),
  hasGoogleMapsApiKey: Boolean(runtimeConfig.googleMapsApiKey),
  hasAuthRedirectUrl: Boolean(runtimeConfig.authRedirectUrl),
  hasPasswordResetRedirectUrl: Boolean(runtimeConfig.passwordResetRedirectUrl)
};
