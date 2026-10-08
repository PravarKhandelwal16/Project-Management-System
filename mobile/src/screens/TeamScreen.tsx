import React, { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useData, useDebounced } from "../hooks/useData";
import { can } from "../services/permissions";
import { roleLabel } from "../shared";
import {
  Page,
  Header,
  Card,
  Txt,
  Avatar,
  Badge,
  Button,
  Field,
  Sheet,
  Empty,
  Skeleton,
  ErrorBox,
  styles,
  confirm,
} from "../components/UI";
import { ProjectPicker } from "../components/ProjectPicker";
import type { Row } from "../types";
export function TeamScreen({ route }: any) {
  const { api, user } = useAuth(),
    [selected, setSelected] = useState<Row | null>(
      route.params?.projectId
        ? { id: route.params.projectId, name: "Loading project..." }
        : null,
    ),
    [adding, setAdding] = useState(false),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const debounced = useDebounced(search);
  const roster = useData(selected ? "/team/projects/" + selected.id : null),
    candidates = useData(
      adding && selected
        ? "/team/projects/" +
            selected.id +
            "/candidates?search=" +
            encodeURIComponent(debounced)
        : null,
    );
  const project = useData(selected ? "/projects/" + selected.id : null);
  useEffect(() => {
    if (project.data)
      setSelected((p) =>
        p?.name === project.data.name
          ? p
          : { id: project.data.id, name: project.data.name },
      );
  }, [project.data]);
  const change = async (path: string, method: string, body?: any) => {
    setBusy(true);
    setError("");
    try {
      await api("/projects/" + selected!.id + "/members" + path, {
        method,
        body,
      });
      await roster.refresh();
      await project.refresh();
      await candidates.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page refresh={roster.refresh} refreshing={roster.loading && !!roster.data}>
      <Header title="Team" subtitle="The people behind the progress." />
      <ProjectPicker value={selected} onChange={setSelected} />
      {(roster.error || project.error) && (
        <ErrorBox
          message={roster.error || project.error}
          retry={() => {
            void roster.refresh();
            void project.refresh();
          }}
        />
      )}
      {error && <ErrorBox message={error} />}
      {!selected && (
        <Empty
          title="Choose a project"
          detail="View its members and workload."
        />
      )}
      {selected && roster.loading && !roster.data && <Skeleton />}
      {roster.data && (
        <>
          {can(user, "team.manage") && (
            <Button title="Add member" onPress={() => setAdding(true)} />
          )}
          {roster.data.map((m: any) => (
            <Card key={m.user_id}>
              <View style={styles.row}>
                <Avatar name={m.full_name} />
                <View style={{ flex: 1 }}>
                  <Txt heading>{m.full_name}</Txt>
                  <Txt muted>{m.email}</Txt>
                </View>
              </View>
              <Badge value={m.is_owner ? "Project owner" : roleLabel(m.role)} />
              {m.assigned_tasks !== null && (
                <Txt muted>
                  {m.assigned_tasks} assigned /{" "}
                  {Number(m.assigned_tasks) - Number(m.open_tasks)} completed /{" "}
                  {m.open_tasks} open
                </Txt>
              )}
              <Button
                title="Email member"
                variant="secondary"
                onPress={() => {
                  void Linking.openURL(
                    "mailto:" + encodeURIComponent(m.email),
                  ).catch(() =>
                    setError("No email app is available on this device."),
                  );
                }}
              />
              {can(user, "team.manage") && !m.is_owner && (
                <Button
                  title="Remove member"
                  variant="danger"
                  busy={busy}
                  onPress={() =>
                    confirm(
                      "Remove this member?",
                      "They will lose access to this project. Open assigned tasks must be reassigned first.",
                      async () => {
                        await change("/" + m.user_id, "DELETE");
                      },
                      setError,
                    )
                  }
                />
              )}
            </Card>
          ))}
        </>
      )}
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add project member"
      >
        <Field label="Search people" value={search} onChangeText={setSearch} />
        {candidates.error && (
          <ErrorBox message={candidates.error} retry={candidates.refresh} />
        )}
        {candidates.loading && !candidates.data && <Skeleton count={1} />}
        {candidates.data?.map((m: any) => (
          <Card key={m.id}>
            <Txt heading>{m.full_name}</Txt>
            <Txt muted>
              {m.email} / {roleLabel(m.role)}
            </Txt>
            <Button
              title="Add to project"
              busy={busy}
              onPress={() => {
                void change("", "POST", { user_id: m.id });
              }}
            />
          </Card>
        ))}
        {candidates.data && !candidates.data.length && (
          <Empty
            title="No matching people"
            detail="Try another search. Existing members are excluded."
          />
        )}
        <Txt muted>
          Search returns up to 50 candidates. Refine the name or email to find a
          person.
        </Txt>
      </Sheet>
    </Page>
  );
}
