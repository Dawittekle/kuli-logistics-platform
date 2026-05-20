import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  '../index.html',
  '../vite.config.ts',
  'App.tsx',
  'main.tsx',
  'styles.css',
  'config/runtime.ts',
  'lib/api.ts',
  'lib/supabase.ts',
  'types/shared.d.ts'
];

for (const file of requiredFiles) {
  await access(new URL(file, import.meta.url), constants.R_OK);
}

const viteConfig = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');

if (!viteConfig.includes('ADMIN_APP_')) {
  throw new Error('admin Vite config must expose ADMIN_APP env variables');
}

console.log('verify: admin Vite foundation ready');
