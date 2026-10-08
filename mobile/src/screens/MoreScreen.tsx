import React, { useState } from "react";
import {
  ChartNoAxesCombined,
  Users,
  Settings,
  ShieldCheck,
  ScrollText,
  UserCog,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { can, canAdmin } from "../services/permissions";
import { roleLabel } from "../shared";
import {
  Page,
  Header,
  Card,
  Avatar,
  Txt,
  Button,
  ErrorBox,
  confirm,
} from "../components/UI";
export function MoreScreen({ navigation }: any) {
  const { user, logout } = useAuth(),
    [error, setError] = useState("");
  const links = [
    [
      "Analytics",
      ChartNoAxesCombined,
      can(user, "analytics.view") &&
        can(user, "projects.view") &&
        can(user, "tasks.view"),
    ],
    ["Team", Users, can(user, "team.view") && can(user, "projects.view")],
    ["Settings", Settings, true],
    ["AdminUsers", UserCog, canAdmin(user, "users.view")],
    ["Roles", ShieldCheck, canAdmin(user, "roles.manage")],
    ["AuditLogs", ScrollText, canAdmin(user, "audit.view")],
  ] as const;
  return (
    <Page>
      <Header title="More" subtitle="Your account and workspace tools." />
      <Card>
        <Avatar name={user!.full_name} size={60} />
        <Txt heading>{user!.full_name}</Txt>
        <Txt muted>{user!.email}</Txt>
        <Txt>{roleLabel(user!.role)}</Txt>
      </Card>
      {error && <ErrorBox message={error} />}
      {links
        .filter(([, , allowed]) => allowed)
        .map(([screen, Icon]) => (
          <Button
            key={screen}
            title={
              screen === "AdminUsers"
                ? "User management"
                : screen === "AuditLogs"
                  ? "Audit logs"
                  : screen === "Roles"
                    ? "Roles and permissions"
                    : screen
            }
            icon={Icon}
            variant="secondary"
            onPress={() => navigation.navigate(screen)}
          />
        ))}
      <Button
        title="Sign out"
        icon={LogOut}
        variant="danger"
        onPress={() =>
          confirm(
            "Sign out?",
            "Your local session will be removed from this device.",
            logout,
            setError,
          )
        }
      />
    </Page>
  );
}
