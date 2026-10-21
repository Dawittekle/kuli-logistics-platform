type RuntimeConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  demoAuthEnabled: boolean;
  googleMapsApiKey?: string;
};

const apiBaseUrl = import.meta.env.ADMIN_APP_API_BASE_URL || 'http://localhost:4000/api/v1';

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl,
  supabaseUrl: import.meta.env.ADMIN_APP_SUPABASE_URL || '',
  supabasePublishableKey: import.meta.env.ADMIN_APP_SUPABASE_PUBLISHABLE_KEY || '',
  demoAuthEnabled: import.meta.env.ADMIN_APP_DEMO_AUTH_ENABLED === 'true',
  googleMapsApiKey: import.meta.env.ADMIN_APP_GOOGLE_MAPS_API_KEY || ''
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabasePublishableKey: Boolean(runtimeConfig.supabasePublishableKey)
};
