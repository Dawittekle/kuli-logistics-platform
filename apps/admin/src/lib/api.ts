import { createKuliApiClient } from '@kuli/shared/api-client';

import { runtimeConfig } from '../config/runtime';
import { supabase } from './supabase';

let sessionAccessToken: string | undefined;

export const setSessionAccessToken = (accessToken?: string | null) => {
  sessionAccessToken = accessToken ?? undefined;
};

export const clearSessionAccessToken = () => {
  sessionAccessToken = undefined;
};

export const getKuliAccessToken = async () => {
  if (sessionAccessToken) {
    return sessionAccessToken;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
};

export const kuliApi = createKuliApiClient({
  baseUrl: runtimeConfig.apiBaseUrl,
  getAccessToken: getKuliAccessToken
});
