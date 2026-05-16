const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: toNumber(process.env.PORT, 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? 'https://example.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'replace-me',
  supabaseJwtMode: process.env.SUPABASE_JWT_MODE ?? 'development_stub',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/kuli',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  bootstrapAdminSupabaseUserId: process.env.BOOTSTRAP_ADMIN_SUPABASE_USER_ID ?? '',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? '',
  bootstrapAdminFullName: process.env.BOOTSTRAP_ADMIN_FULL_NAME ?? 'Seed Admin'
};
