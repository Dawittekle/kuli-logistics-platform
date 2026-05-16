import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredPaths = [
  'README.md',
  'package.json',
  'docker-compose.yml',
  'apps/api/src/main.mjs',
  'apps/admin/src/main.mjs',
  'apps/mobile/src/main.mjs',
  'packages/shared/src/index.mjs',
  'docs/project_overview.md',
  'docs/system_architecture.md',
  'docs/feature_specifications.md',
  'docs/database_design.md',
  'docs/api_architecture.md',
  'docs/frontend_architecture.md',
  'docs/backend_architecture.md',
  'docs/development_phases.md',
  'docs/progress_tracking.md',
  'docs/engineering_decisions.md',
  'docs/risks_and_unknowns.md',
  'docs/testing_strategy.md',
  'docs/deployment_and_devops.md',
  'docs/security_considerations.md',
  'docs/references.md',
  'docs/glossary.md'
];

for (const filePath of requiredPaths) {
  await access(filePath, constants.R_OK);
}

console.log(`lint: validated ${requiredPaths.length} required files`);

