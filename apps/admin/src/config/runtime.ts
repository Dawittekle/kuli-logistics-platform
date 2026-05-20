type RuntimeConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: import.meta.env.ADMIN_APP_API_BASE_URL || 'http://localhost:4000/api/v1',
  supabaseUrl: import.meta.env.ADMIN_APP_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.ADMIN_APP_SUPABASE_ANON_KEY || ''
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabaseAnonKey: Boolean(runtimeConfig.supabaseAnonKey)
};
