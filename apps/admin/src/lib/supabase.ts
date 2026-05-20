import { createClient } from '@supabase/supabase-js';

import { runtimeConfig } from '../config/runtime';

export const supabase = createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
