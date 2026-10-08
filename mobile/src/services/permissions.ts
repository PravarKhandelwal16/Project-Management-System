import type { User, Row } from "../types";
export const can = (user: User | null, permission: string) =>
  Boolean(user?.permissions?.includes(permission));
export const isAdmin = (user: User | null) =>
  Boolean(user && ["super_admin", "admin"].includes(user.role));
export const canAdmin = (user: User | null, permission: string) =>
  isAdmin(user) && can(user, permission);
export const canChangeStatus = (user: User | null, task: Row) =>
  can(user, "tasks.view") &&
  can(user, "projects.view") &&
  (can(user, "tasks.status") ||
    (can(user, "tasks.status_assigned") && task.assigned_to === user?.id));
export const canManageAccount = (actor: User | null, target: Row) =>
  Boolean(
    actor &&
    actor.id !== target.id &&
    canAdmin(actor, "users.roles") &&
    (actor.role === "super_admin" ||
      !["super_admin", "admin"].includes(target.role)),
  );
export const assignableRole = (actor: User | null, role: string) =>
  actor?.role === "super_admin" || !["super_admin", "admin"].includes(role);
