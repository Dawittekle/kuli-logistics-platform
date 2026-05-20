import { createKuliApiClient } from '@kuli/shared/api-client';

import { supabase } from './supabase';
import { runtimeConfig } from '../config/runtime';

export const kuliApi = createKuliApiClient({
  baseUrl: runtimeConfig.apiBaseUrl,
  getAccessToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
});
