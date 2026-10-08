const catalog = require('../../shared/access.json');
const ROLES = Object.freeze({ SUPER_ADMIN: 'super_admin', ADMIN: 'admin', PORTFOLIO_MANAGER: 'portfolio_manager', PROJECT_MANAGER: 'project_manager', PROJECT_COORDINATOR: 'project_coordinator', TEAM_LEAD: 'team_lead', MEMBER: 'member', VIEWER: 'viewer' });
const ALL_ROLES = catalog.roles.map(role => role.key);
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const PROJECT_CREATOR_ROLES = catalog.roles.filter(role => role.permissions.includes('projects.create')).map(role => role.key);
module.exports = { ROLES, ALL_ROLES, ADMIN_ROLES, PROJECT_CREATOR_ROLES };
