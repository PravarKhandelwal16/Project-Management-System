import { test, expect } from "@jest/globals";
import {
  can,
  canAdmin,
  canChangeStatus,
  canManageAccount,
  assignableRole,
} from "../src/services/permissions";
import {
  roleCatalog,
  createTaskSchema,
  registerSchema,
  createProjectSchema,
} from "../src/shared";
import type { User } from "../src/types";
const user = (role: string, permissions: string[]): User => ({
  id: 5,
  full_name: "Test",
  email: "test@example.test",
  role,
  permissions,
});
test.each(roleCatalog.map((r) => [r.key, r.permissions] as const))(
  "%s uses effective grants, not a second role policy",
  (role, permissions) => {
    const current = user(role, permissions);
    expect(can(current, "tasks.view")).toBe(true);
    expect(canAdmin(current, "users.view")).toBe(
      ["admin", "super_admin"].includes(role),
    );
    expect(can(user(role, []), "tasks.view")).toBe(false);
  },
);
test("members can update only assigned tasks; read-only users cannot mutate", () => {
  const member = user("member", [
    "projects.view",
    "tasks.view",
    "tasks.status_assigned",
  ]);
  expect(canChangeStatus(member, { assigned_to: 5 })).toBe(true);
  expect(canChangeStatus(member, { assigned_to: 6 })).toBe(false);
  expect(
    canChangeStatus(user("viewer", ["projects.view", "tasks.view"]), {
      assigned_to: 5,
    }),
  ).toBe(false);
  expect(canAdmin(user("project_manager", ["users.view"]), "users.view")).toBe(
    false,
  );
});
test("protected administrative boundaries and self-promotion are hidden", () => {
  const admin = user("admin", ["users.roles"]);
  expect(canManageAccount(admin, { id: 5, role: "member" })).toBe(false);
  expect(canManageAccount(admin, { id: 6, role: "super_admin" })).toBe(false);
  expect(canManageAccount(admin, { id: 6, role: "member" })).toBe(true);
  expect(assignableRole(admin, "admin")).toBe(false);
});
test("shared registration, project and task rules are reused on mobile", () => {
  expect(
    registerSchema.safeParse({
      full_name: "Test",
      email: "invalid",
      password: "weak",
    }).success,
  ).toBe(false);
  expect(
    createTaskSchema.safeParse({
      project_id: 1,
      name: "Review",
      priority: "Urgent",
    }).success,
  ).toBe(false);
  expect(
    createTaskSchema.safeParse({
      project_id: 1,
      name: "Review",
      due_date: "2026-02-30",
    }).success,
  ).toBe(false);
  expect(
    createProjectSchema.safeParse({
      name: "Delivery",
      start_date: "2026-10-20",
      end_date: "2026-10-01",
    }).success,
  ).toBe(false);
});
