import React, { useState } from "react";
import { View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useData } from "../hooks/useData";
import { can, canChangeStatus } from "../services/permissions";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from "../shared";
import {
  Page,
  Header,
  Badge,
  Card,
  Txt,
  Picker,
  Button,
  Skeleton,
  ErrorBox,
  styles,
  displayDate,
  optionValues,
  confirm,
} from "../components/UI";
export function TaskDetailsScreen({ route, navigation }: any) {
  const { id } = route.params,
    { user, api } = useAuth(),
    task = useData("/tasks/" + id),
    project = useData(
      task.data && can(user, "tasks.assign")
        ? "/projects/" + task.data.project_id
        : null,
    );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const t = task.data;
  const change = async (path: string, body: any) => {
    setBusy(true);
    setError("");
    try {
      await api("/tasks/" + id + "/" + path, { method: "PATCH", body });
      await task.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const eligible = project.data
    ? [
        { label: "Unassigned", value: null },
        { label: project.data.owner_name, value: project.data.user_id },
        ...project.data.members
          .filter((m: any) => m.is_active)
          .map((m: any) => ({ label: m.full_name, value: m.user_id })),
      ]
    : [{ label: "Unassigned", value: null }];
  return (
    <Page refresh={task.refresh} refreshing={task.loading && !!t}>
      {task.error && <ErrorBox message={task.error} retry={task.refresh} />}
      {error && <ErrorBox message={error} />}
      {task.loading && !t && <Skeleton />}
      {t && (
        <>
          <Header title={t.name} subtitle={t.project_name} />
          <View style={styles.wrap}>
            <Badge value={t.status} />
            <Badge value={t.priority} />
          </View>
          <Card>
            <Txt>{t.description || "No description added."}</Txt>
            <Txt muted>Due: {displayDate(t.due_date)}</Txt>
            <Txt muted>Assignee: {t.assignee_name || "Unassigned"}</Txt>
            <Txt muted>Created by: {t.creator_name || "Unknown"}</Txt>
            <Txt muted>Created: {displayDate(t.created_at)}</Txt>
            <Txt muted>Updated: {displayDate(t.updated_at)}</Txt>
          </Card>
          <Button
            title="View project"
            variant="secondary"
            onPress={() =>
              navigation.navigate("ProjectDetails", { id: t.project_id })
            }
          />
          {canChangeStatus(user, t) && (
            <Picker
              label="Update status"
              disabled={busy}
              value={t.status}
              options={optionValues(TASK_STATUS_VALUES)}
              onChange={(status) => {
                void change("status", { status });
              }}
            />
          )}
          {can(user, "tasks.edit") && (
            <Picker
              label="Update priority"
              disabled={busy}
              value={t.priority}
              options={optionValues(TASK_PRIORITY_VALUES)}
              onChange={(priority) => {
                void change("priority", { priority });
              }}
            />
          )}
          {can(user, "tasks.assign") && (
            <>
              {project.error && (
                <ErrorBox message={project.error} retry={project.refresh} />
              )}
              <Picker
                label="Assign task"
                disabled={busy || !project.data}
                value={t.assigned_to}
                options={eligible}
                onChange={(assigned_to) => {
                  void change("assign", { assigned_to });
                }}
              />
            </>
          )}
          {can(user, "tasks.edit") && (
            <Button
              title="Edit task"
              variant="secondary"
              onPress={() => navigation.navigate("TaskForm", { id })}
            />
          )}
          {can(user, "tasks.delete") && (
            <Button
              title="Delete task"
              variant="danger"
              busy={busy}
              onPress={() =>
                confirm(
                  "Delete this task?",
                  "This action cannot be undone.",
                  async () => {
                    setBusy(true);
                    try {
                      await api("/tasks/" + id, { method: "DELETE" });
                      navigation.goBack();
                    } finally {
                      setBusy(false);
                    }
                  },
                  setError,
                )
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
