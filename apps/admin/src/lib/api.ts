import { createKuliApiClient } from '@kuli/shared/api-client';

import { runtimeConfig } from '../config/runtime';
import { supabase } from './supabase';

export const kuliApi = createKuliApiClient({
  baseUrl: runtimeConfig.apiBaseUrl,
  getAccessToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
});
