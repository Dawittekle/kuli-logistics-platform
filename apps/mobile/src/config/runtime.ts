import Constants from 'expo-constants';

type KuliRuntimeConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  demoAuthEnabled: boolean;
};

const extra = (Constants.expoConfig?.extra?.kuli ?? {}) as Partial<KuliRuntimeConfig>;

export const runtimeConfig: KuliRuntimeConfig = {
  apiBaseUrl: extra.apiBaseUrl || 'http://localhost:4000/api/v1',
  supabaseUrl: extra.supabaseUrl || '',
  supabaseAnonKey: extra.supabaseAnonKey || '',
  demoAuthEnabled: Boolean(extra.demoAuthEnabled)
};

export const runtimeReadiness = {
  hasApiBaseUrl: Boolean(runtimeConfig.apiBaseUrl),
  hasSupabaseUrl: Boolean(runtimeConfig.supabaseUrl),
  hasSupabaseAnonKey: Boolean(runtimeConfig.supabaseAnonKey),
  demoAuthEnabled: runtimeConfig.demoAuthEnabled
};
