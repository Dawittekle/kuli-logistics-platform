import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));

const parseEnvFile = () => {
  try {
    const contents = readFileSync(resolve(appRoot, '.env'), 'utf8');

    return Object.fromEntries(
      contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const [key, ...valueParts] = line.split('=');
          return [key, valueParts.join('=').trim()];
        })
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
};

const env = parseEnvFile();

const resolveBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const apiBaseUrl = process.env.MOBILE_APP_API_BASE_URL ?? env.MOBILE_APP_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const demoAuthEnv = process.env.MOBILE_APP_DEMO_AUTH_ENABLED ?? env.MOBILE_APP_DEMO_AUTH_ENABLED;
const isLocalApi = /^(http:\/\/)?(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/.test(apiBaseUrl);

export default ({ config }) => ({
  ...config,
  name: 'KULI',
  slug: 'kuli-mobile',
  scheme: 'kuli',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  jsEngine: 'jsc',
  splash: {
    backgroundColor: '#0d3446'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.kuli.logistics'
  },
  android: {
    package: 'com.kuli.logistics'
  },
  extra: {
    kuli: {
      apiBaseUrl,
      supabaseUrl: process.env.MOBILE_APP_SUPABASE_URL ?? env.MOBILE_APP_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.MOBILE_APP_SUPABASE_ANON_KEY ?? env.MOBILE_APP_SUPABASE_ANON_KEY ?? '',
      demoAuthEnabled: resolveBoolean(demoAuthEnv, isLocalApi)
    }
  }
});
