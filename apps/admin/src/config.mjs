import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const loadEnvFile = () => {
  let contents;

  try {
    contents = readFileSync(resolve(appRoot, '.env'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');

    if (process.env[key] === undefined) {
      process.env[key] = valueParts.join('=').trim();
    }
  }
};

loadEnvFile();

export const adminAppConfig = {
  apiBaseUrl: process.env.ADMIN_APP_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  supabaseUrl: process.env.ADMIN_APP_SUPABASE_URL ?? 'https://example.supabase.co',
  supabasePublishableKeyConfigured: Boolean(process.env.ADMIN_APP_SUPABASE_PUBLISHABLE_KEY)
};
