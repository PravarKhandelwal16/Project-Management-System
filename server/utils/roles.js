/**
 * Standard User Roles and Permissions for Project Management System
 */

const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  MEMBER: 'member',
});

const ALL_ROLES = Object.values(ROLES);

/**
 * Roles permitted to create projects
 */
const PROJECT_CREATOR_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.PROJECT_MANAGER,
];

/**
 * Roles permitted to access administrative management
 */
const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
];

module.exports = {
  ROLES,
  ALL_ROLES,
  PROJECT_CREATOR_ROLES,
  ADMIN_ROLES,
};
