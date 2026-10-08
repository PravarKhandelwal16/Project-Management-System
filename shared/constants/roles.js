import access from '../access.json' with { type: 'json' };
export const ROLES = Object.fromEntries(access.roles.map(role => [role.key.toUpperCase(), role.key]));
export const ROLE_VALUES = access.roles.map(role => role.key);
export default { ROLES, ROLE_VALUES };
