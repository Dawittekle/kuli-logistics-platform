import { createKuliApiClient } from '@kuli/shared/api-client';

import { supabase } from './supabase';
import { runtimeConfig } from '../config/runtime';

let demoAccessToken: string | undefined;

export const setDemoAccessToken = (accessToken: string) => {
  demoAccessToken = accessToken;
};

export const clearDemoAccessToken = () => {
  demoAccessToken = undefined;
};

export const kuliApi = createKuliApiClient({
  baseUrl: runtimeConfig.apiBaseUrl,
  getAccessToken: async () => {
    if (demoAccessToken) {
      return demoAccessToken;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
});
