import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useData, usePaged, useDebounced } from "../hooks/useData";
import { canManageAccount, assignableRole } from "../services/permissions";
import { roleCatalog, roleLabel } from "../shared";
import access from "../../../shared/access.json";
import {
  Page,
  Header,
  Field,
  Picker,
  Card,
  Txt,
  Badge,
  Button,
  Avatar,
  Skeleton,
  ErrorBox,
  Empty,
  Sheet,
  styles,
  confirm,
} from "../components/UI";
import { colors as c } from "../theme";
import type { Row } from "../types";
export function AdminUsersScreen({ navigation }: any) {
  const [search, setSearch] = useState(""),
    [role, setRole] = useState("");
  const list = usePaged("/admin/users", { search: useDebounced(search), role });
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <FlatList
        data={list.rows}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={c.blue}
            refreshing={list.loading && !!list.rows.length}
            onRefresh={list.refresh}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <Header
              title="User management"
              subtitle="People and their workspace access."
            />
            <Field
              label="Search users"
              value={search}
              onChangeText={setSearch}
            />
            <Picker
              label="Role"
              value={role}
              options={[
                { label: "All roles", value: "" },
                ...roleCatalog.map((r) => ({ label: r.label, value: r.key })),
              ]}
              onChange={setRole}
            />
            {list.error && (
              <ErrorBox message={list.error} retry={list.refresh} />
            )}
          </View>
        }
        renderItem={({ item: u }) => (
          <Card
            label={"View user " + u.full_name}
            onPress={() => navigation.navigate("UserDetails", { id: u.id })}
          >
            <View style={styles.row}>
              <Avatar name={u.full_name} />
              <View style={{ flex: 1 }}>
                <Txt heading>{u.full_name}</Txt>
                <Txt muted>{u.email}</Txt>
              </View>
            </View>
            <View style={styles.wrap}>
              <Badge value={roleLabel(u.role)} />
              <Badge value={u.is_active ? "Active" : "Inactive"} />
            </View>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          list.loading ? (
            <Skeleton />
          ) : !list.error ? (
            <Empty
              title="No matching users"
              detail="Change your search or role filter."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            {list.hasMore && (
              <Button
                title="Load more users"
                busy={list.loading}
                variant="secondary"
                onPress={list.more}
              />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
export function UserDetailsScreen({ route }: any) {
  const { api, user } = useAuth(),
    data = useData("/admin/users/" + route.params.id),
    [role, setRole] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (data.data) setRole(data.data.role);
  }, [data.data]);
  const u = data.data;
  const save = () =>
    confirm(
      "Change this role?",
      "The account will inherit the new role policy and individual permission overrides will be reset.",
      async () => {
        setBusy(true);
        setError("");
        try {
          await api("/admin/users/" + u.id + "/role", {
            method: "PATCH",
            body: { role },
          });
          await data.refresh();
          setSaved(true);
        } finally {
          setBusy(false);
        }
      },
      setError,
    );
  return (
    <Page refresh={data.refresh} refreshing={data.loading && !!u}>
      {data.error && <ErrorBox message={data.error} retry={data.refresh} />}
      {error && <ErrorBox message={error} />}
      {data.loading && !u && <Skeleton />}
      {u && (
        <>
          <Header title={u.full_name} subtitle={u.email} />
          <Card>
            <Badge value={roleLabel(u.role)} />
            <Txt muted>Account: {u.is_active ? "Active" : "Inactive"}</Txt>
            <Txt muted>Department: {u.department || "Not set"}</Txt>
            <Txt muted>Job title: {u.job_title || "Not set"}</Txt>
          </Card>
          {canManageAccount(user, u) ? (
            <>
              <Picker
                label="Change role"
                value={role}
                options={roleCatalog
                  .filter((r) => assignableRole(user, r.key))
                  .map((r) => ({ label: r.label, value: r.key }))}
                onChange={(v) => {
                  setRole(v);
                  setSaved(false);
                }}
              />
              <Button
                title="Save role"
                busy={busy}
                disabled={role === u.role}
                onPress={save}
              />
            </>
          ) : (
            <Txt muted>
              This account is protected from role changes by your current access
              level.
            </Txt>
          )}
          {saved && (
            <Txt accessibilityRole="alert" style={{ color: c.green }}>
              Role updated.
            </Txt>
          )}
          <Card>
            <Txt heading>Effective permissions</Txt>
            {u.permissions.map((p: string) => (
              <Txt key={p} muted>
                {access.permissions.find((i) => i.key === p)?.label || p}
              </Txt>
            ))}
          </Card>
        </>
      )}
    </Page>
  );
}
export function RolesScreen() {
  const { api, user, refreshUser } = useAuth(),
    data = useData<Row[]>("/admin/roles"),
    [editing, setEditing] = useState<Row | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const locked = (role: Row) =>
    role.key === "super_admin" ||
    (user?.role === "admin" && role.key === "admin");
  const toggleAllowed = (p: (typeof access.permissions)[number]) =>
    Boolean(
      editing &&
      !locked(editing) &&
      (!p.administrative || editing.key === "admin") &&
      user?.permissions.includes(p.key),
    );
  const save = () =>
    confirm(
      "Update role permissions?",
      "This policy applies to all accounts with this role. The backend will check protected grants and concurrent changes.",
      async () => {
        setBusy(true);
        setError("");
        try {
          await api("/admin/roles/" + editing!.key, {
            method: "PUT",
            body: { permissions: selected, version: editing!.version },
          });
          setEditing(null);
          await data.refresh();
          await refreshUser();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      },
      setError,
    );
  return (
    <Page refresh={data.refresh} refreshing={data.loading && !!data.data}>
      <Header
        title="Roles and permissions"
        subtitle="Existing workspace policies, shared with the web."
      />
      {data.error && <ErrorBox message={data.error} retry={data.refresh} />}
      {error && <ErrorBox message={error} />}
      {data.loading && !data.data && <Skeleton />}
      {data.data?.map((r) => (
        <Card key={r.key}>
          <Txt heading>{r.label}</Txt>
          <Txt muted>{r.description}</Txt>
          <Txt muted>
            {r.permissions.length} permissions / version {r.version}
          </Txt>
          <Button
            title={locked(r) ? "View protected policy" : "Edit permissions"}
            variant="secondary"
            onPress={() => {
              setEditing(r);
              setSelected([...r.permissions]);
              setError("");
            }}
          />
        </Card>
      ))}
      <Sheet
        open={!!editing}
        title={editing?.label || "Permissions"}
        onClose={() => setEditing(null)}
      >
        {error && <ErrorBox message={error} />}
        {editing &&
          access.permissions.map((p) => (
            <View key={p.key} style={styles.between}>
              <View style={{ flex: 1 }}>
                <Txt>{p.label}</Txt>
                <Txt muted>{p.group}</Txt>
              </View>
              <Switch
                accessibilityLabel={p.label}
                disabled={!toggleAllowed(p)}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor={c.text}
                value={selected.includes(p.key)}
                onValueChange={(enabled) =>
                  setSelected((s) =>
                    enabled ? [...s, p.key] : s.filter((key) => key !== p.key),
                  )
                }
              />
            </View>
          ))}
        {editing && !locked(editing) && (
          <Button title="Save permissions" busy={busy} onPress={save} />
        )}
        <Txt muted>
          Protected policies and grants beyond your own access cannot be
          changed.
        </Txt>
      </Sheet>
    </Page>
  );
}
export function AuditLogsScreen() {
  const [search, setSearch] = useState(""),
    [action, setAction] = useState(""),
    [selected, setSelected] = useState<Row | null>(null);
  const list = usePaged("/admin/audit-logs", {
    search: useDebounced(search),
    action,
  });
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <FlatList
        data={list.rows}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={c.blue}
            refreshing={list.loading && !!list.rows.length}
            onRefresh={list.refresh}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <Header
              title="Audit logs"
              subtitle="A record of workspace changes."
            />
            <Field
              label="Search audit logs"
              value={search}
              onChangeText={setSearch}
            />
            <Field
              label="Action filter (exact, optional)"
              value={action}
              onChangeText={setAction}
              autoCapitalize="characters"
              placeholder="TASK_CREATED"
            />
            {list.error && (
              <ErrorBox message={list.error} retry={list.refresh} />
            )}
          </View>
        }
        renderItem={({ item: a }) => (
          <Card
            label={"Audit details for " + a.action}
            onPress={() => setSelected(a)}
          >
            <Txt heading>{a.action.replaceAll("_", " ")}</Txt>
            <Txt muted>
              {a.user_name || a.actor_name || "System"} /{" "}
              {a.user_email || a.actor_email || ""}
            </Txt>
            <Txt muted>{new Date(a.created_at).toLocaleString()}</Txt>
            <Badge
              value={
                a.resource_type + (a.resource_id ? " #" + a.resource_id : "")
              }
            />
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          list.loading ? (
            <Skeleton />
          ) : !list.error ? (
            <Empty
              title="No matching activity"
              detail="Change your filters to see more logs."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            {list.hasMore && (
              <Button
                title="Load more logs"
                busy={list.loading}
                variant="secondary"
                onPress={list.more}
              />
            )}
          </View>
        }
      />
      <Sheet
        open={!!selected}
        title="Audit details"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <Txt heading>{selected.action}</Txt>
            <Txt muted>{new Date(selected.created_at).toLocaleString()}</Txt>
            <Txt muted>
              {selected.user_name || "System"} / {selected.resource_type} #
              {selected.resource_id || "-"}
            </Txt>
            <Txt selectable>
              {typeof selected.details === "string"
                ? selected.details
                : JSON.stringify(selected.details, null, 2)}
            </Txt>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
