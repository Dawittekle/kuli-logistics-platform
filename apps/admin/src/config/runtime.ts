type RuntimeConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  demoAuthEnabled: boolean;
};

const apiBaseUrl = import.meta.env.ADMIN_APP_API_BASE_URL || 'http://localhost:4000/api/v1';
const isLocalApi = /^(http:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiBaseUrl);

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl,
  supabaseUrl: import.meta.env.ADMIN_APP_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.ADMIN_APP_SUPABASE_ANON_KEY || '',
  demoAuthEnabled: import.meta.env.ADMIN_APP_DEMO_AUTH_ENABLED === 'true' || isLocalApi
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabaseAnonKey: Boolean(runtimeConfig.supabaseAnonKey),
  demoAuthEnabled: runtimeConfig.demoAuthEnabled
};
