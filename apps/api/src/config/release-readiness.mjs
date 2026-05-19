const defaultSupabaseUrl = 'https://example.supabase.co';

export const validateRuntimeConfig = (config) => {
  const checks = [
    {
      id: 'mongodb_uri',
      ok: Boolean(config.mongodbUri),
      severity: 'error',
      message: 'MongoDB URI is configured.'
    },
    {
      id: 'supabase_url',
      ok: Boolean(config.supabaseUrl) && config.supabaseUrl !== defaultSupabaseUrl,
      severity: config.nodeEnv === 'production' ? 'error' : 'warning',
      message: 'Supabase project URL is configured.'
    },
    {
      id: 'supabase_anon_key',
      ok: Boolean(config.supabaseAnonKey) && config.supabaseAnonKey !== 'replace-me',
      severity: config.nodeEnv === 'production' ? 'error' : 'warning',
      message: 'Supabase anon key is configured.'
    },
    {
      id: 'jwt_mode',
      ok: config.nodeEnv !== 'production' || config.supabaseJwtMode !== 'development_stub',
      severity: 'error',
      message: 'Production does not use development JWT mode.'
    },
    {
      id: 'bootstrap_admin',
      ok: Boolean(config.bootstrapAdminSupabaseUserId || config.bootstrapAdminEmail),
      severity: 'warning',
      message: 'Admin bootstrap or provisioning path is configured.'
    }
  ];
  const errors = checks.filter((check) => !check.ok && check.severity === 'error');

  return {
    ok: errors.length === 0,
    checks
  };
};

export const assertRuntimeConfig = (config) => {
  const readiness = validateRuntimeConfig(config);

  if (config.nodeEnv === 'production' && !readiness.ok) {
    const failed = readiness.checks.filter((check) => !check.ok && check.severity === 'error');
    throw new Error(`Production runtime configuration failed: ${failed.map((check) => check.id).join(', ')}`);
  }

  return readiness;
};
