import { loadLocalEnvFiles } from './load-env-file.mjs';

loadLocalEnvFiles();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const withoutTrailingSlash = (value) => value.replace(/\/+$/, '');
const toList = (value) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const supabaseUrl = withoutTrailingSlash(process.env.SUPABASE_URL ?? 'https://example.supabase.co');
const defaultSupabaseIssuer = `${supabaseUrl}/auth/v1`;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: toNumber(process.env.PORT, 4000),
  supabaseUrl,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? 'replace-me',
  supabaseJwtMode: process.env.SUPABASE_JWT_MODE ?? 'development_stub',
  supabaseJwtIssuer: process.env.SUPABASE_JWT_ISSUER ?? defaultSupabaseIssuer,
  supabaseJwtAudience: process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated',
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL ?? `${defaultSupabaseIssuer}/.well-known/jwks.json`,
  demoAuthEnabled: toBoolean(process.env.DEMO_AUTH_ENABLED),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27018/kuli',
  mongodbServerSelectionTimeoutMs: toNumber(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 5000),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  corsOrigins: toList(process.env.CORS_ORIGINS),
  corsAllowPrivateNetwork: toBoolean(process.env.CORS_ALLOW_PRIVATE_NETWORK, (process.env.NODE_ENV ?? 'development') !== 'production'),
  bootstrapAdminSupabaseUserId: process.env.BOOTSTRAP_ADMIN_SUPABASE_USER_ID ?? '',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? '',
  bootstrapAdminFullName: process.env.BOOTSTRAP_ADMIN_FULL_NAME ?? 'Seed Admin'
};
