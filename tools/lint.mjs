import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredPaths = [
  'README.md',
  'package.json',
  'docker-compose.yml',
  'apps/api/src/main.mjs',
  'apps/api/src/config/env.mjs',
  'apps/api/src/config/load-env-file.mjs',
  'apps/api/src/config/mongo.mjs',
  'apps/api/src/integrations/maps/deterministic-maps-provider.mjs',
  'apps/api/src/modules/accounts/account-service.mjs',
  'apps/api/src/modules/accounts/mongo-user-repository.mjs',
  'apps/api/src/modules/audit/mongo-audit-log-repository.mjs',
  'apps/api/src/modules/files/mongo-file-repository.mjs',
  'apps/api/src/modules/logistics/default-pricing-rule.mjs',
  'apps/api/src/modules/logistics/marketplace-service.mjs',
  'apps/api/src/modules/logistics/mongo-kuli-request-repository.mjs',
  'apps/api/src/modules/logistics/mongo-pricing-rule-repository.mjs',
  'apps/api/src/modules/logistics/mongo-trip-offer-repository.mjs',
  'apps/api/src/modules/logistics/quote-service.mjs',
  'apps/api/src/modules/notifications/mongo-notification-repository.mjs',
  'apps/api/src/modules/vehicle-registry/default-vehicle-classes.mjs',
  'apps/api/src/modules/vehicle-registry/mongo-vehicle-class-repository.mjs',
  'apps/api/src/modules/vehicle-registry/mongo-vehicle-document-repository.mjs',
  'apps/api/src/modules/vehicle-registry/mongo-vehicle-repository.mjs',
  'apps/api/src/modules/vehicle-registry/vehicle-registry-service.mjs',
  'apps/api/src/modules/vehicle-registry/vehicle-state.mjs',
  'apps/admin/src/main.mjs',
  'apps/admin/src/config.mjs',
  'apps/admin/src/pricing-shell.mjs',
  'apps/mobile/src/main.mjs',
  'apps/mobile/src/config.mjs',
  'apps/mobile/src/marketplace-shell.mjs',
  'apps/mobile/src/quote-shell.mjs',
  'packages/shared/src/index.mjs',
  'tools/verify-startup.mjs',
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
