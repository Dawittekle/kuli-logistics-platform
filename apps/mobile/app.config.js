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

const apiBaseUrl = process.env.MOBILE_APP_API_BASE_URL ?? env.MOBILE_APP_API_BASE_URL ?? 'http://localhost:4000/api/v1';
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
    backgroundColor: '#000000'
  },
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission: 'KULI lets you upload photos for vehicle documents and report evidence.',
        cameraPermission: 'KULI lets you take pictures for vehicle documents and report evidence.'
      }
    ]
  ],
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
      googleMapsApiKey: process.env.MOBILE_APP_GOOGLE_MAPS_API_KEY ?? env.MOBILE_APP_GOOGLE_MAPS_API_KEY ?? '',
      authRedirectUrl: process.env.MOBILE_APP_AUTH_REDIRECT_URL ?? env.MOBILE_APP_AUTH_REDIRECT_URL ?? 'kuli://auth/callback',
      passwordResetRedirectUrl:
        process.env.MOBILE_APP_PASSWORD_RESET_REDIRECT_URL ?? env.MOBILE_APP_PASSWORD_RESET_REDIRECT_URL ?? 'kuli://auth/reset-password'
    }
  }
});
