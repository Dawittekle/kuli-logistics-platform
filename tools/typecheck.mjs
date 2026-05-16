const shared = await import('../packages/shared/src/index.mjs');
const apiModule = await import('../apps/api/src/modules/identity/profile-sync-policy.mjs');
const mobileShell = await import('../apps/mobile/src/auth-shell.mjs');
const adminShell = await import('../apps/admin/src/auth-shell.mjs');

if (!shared.publicRegistrationRoles.includes(shared.roles.client)) {
  throw new Error('client must remain a public registration role');
}

if (!shared.publicRegistrationRoles.includes(shared.roles.truckOwner)) {
  throw new Error('truck_owner must remain a public registration role');
}

if (apiModule.isPublicRegistrationRole(shared.roles.admin)) {
  throw new Error('admin must not be a public registration role');
}

if (!mobileShell.mobileEntryRouteByRole[shared.roles.client]) {
  throw new Error('mobile client entry route missing');
}

if (!adminShell.adminEntryRouteByRole[shared.roles.admin]) {
  throw new Error('admin entry route missing');
}

console.log('typecheck: validated shared contracts and route shells');

