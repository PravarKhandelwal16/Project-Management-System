// Reuse the web/backend definitions; no second set of role or validation rules.
export * from "../../shared/constants/index.js";
export * from "../../shared/validation/index.js";
import access from "../../shared/access.json";
export const roleCatalog = access.roles;
export const roleLabel = (role: string) =>
  roleCatalog.find((item) => item.key === role)?.label || role;
