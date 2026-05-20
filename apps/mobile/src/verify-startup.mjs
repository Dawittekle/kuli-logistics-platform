import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'App.tsx',
  'config/runtime.ts',
  'lib/api.ts',
  'lib/supabase.ts',
  'theme.ts',
  'types/shared.d.ts'
];

for (const file of requiredFiles) {
  await access(new URL(file, import.meta.url), constants.R_OK);
}

const appConfig = await readFile(new URL('../app.config.js', import.meta.url), 'utf8');

for (const expectedKey of ['MOBILE_APP_API_BASE_URL', 'MOBILE_APP_SUPABASE_URL', 'MOBILE_APP_SUPABASE_ANON_KEY']) {
  if (!appConfig.includes(expectedKey)) {
    throw new Error(`mobile runtime config must map ${expectedKey}`);
  }
}

console.log('verify: mobile Expo foundation ready');
