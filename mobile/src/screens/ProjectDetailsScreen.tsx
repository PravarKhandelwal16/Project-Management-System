import React, { useState } from "react";
import { View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useData, usePaged } from "../hooks/useData";
import { can } from "../services/permissions";
import {
  Page,
  Header,
  Badge,
  Card,
  Txt,
  Progress,
  Section,
  Button,
  Empty,
  Skeleton,
  ErrorBox,
  Avatar,
  styles,
  displayDate,
  confirm,
} from "../components/UI";
import { TaskCard } from "../components/ResourceCards";
import { roleLabel } from "../shared";
export function ProjectDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { user, api } = useAuth(),
    project = useData("/projects/" + id),
    tasks = usePaged(
      can(user, "tasks.view") ? "/projects/" + id + "/tasks" : null,
    );
  const [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false);
  const p = project.data;
  const refresh = () => {
    void project.refresh();
    void tasks.refresh();
  };
  return (
    <Page refresh={refresh} refreshing={project.loading && !!p}>
      {project.error && <ErrorBox message={project.error} retry={refresh} />}
      {error && <ErrorBox message={error} />}
      {project.loading && !p && <Skeleton />}
      {p && (
        <>
          <Header title={p.name} subtitle={"Managed by " + p.owner_name} />
          <Badge value={p.status} />
          <Card>
            <Txt>{p.description || "No description added."}</Txt>
            <Progress value={p.progress} />
            <Txt muted>Start: {displayDate(p.start_date)}</Txt>
            <Txt muted>End: {displayDate(p.end_date)}</Txt>
            {p.total_tasks !== null && (
              <Txt>
                {p.completed_tasks} of {p.total_tasks} tasks completed
              </Txt>
            )}
          </Card>
          <View style={styles.wrap}>
            {can(user, "projects.edit") && (
              <Button
                title="Edit project"
                variant="secondary"
                onPress={() => navigation.navigate("ProjectForm", { id })}
              />
            )}
            {can(user, "tasks.view") && can(user, "tasks.create") && (
              <Button
                title="Create task"
                onPress={() =>
                  navigation.navigate("TaskForm", { projectId: id })
                }
              />
            )}
            {can(user, "team.view") && (
              <Button
                title={
                  can(user, "team.manage") ? "Manage members" : "View team"
                }
                variant="secondary"
                onPress={() => navigation.navigate("Team", { projectId: id })}
              />
            )}
          </View>
          <Section title="Project members" />
          <Card>
            <View style={styles.row}>
              <Avatar name={p.owner_name} />
              <View>
                <Txt>{p.owner_name}</Txt>
                <Txt muted>Project owner</Txt>
              </View>
            </View>
            {p.members.map((m: any) => (
              <View key={m.user_id || m.id} style={styles.row}>
                <Avatar name={m.full_name} />
                <View style={{ flex: 1 }}>
                  <Txt>{m.full_name}</Txt>
                  <Txt muted>{roleLabel(m.role)}</Txt>
                </View>
              </View>
            ))}
          </Card>
          {can(user, "tasks.view") && (
            <>
              <Section title="Project tasks" />
              {tasks.error && (
                <ErrorBox message={tasks.error} retry={tasks.refresh} />
              )}
              {tasks.rows.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onPress={() =>
                    navigation.navigate("TaskDetails", { id: t.id })
                  }
                />
              ))}
              {tasks.loading && !tasks.rows.length && <Skeleton count={1} />}
              {!tasks.loading && !tasks.rows.length && !tasks.error && (
                <Empty
                  title="No tasks yet"
                  detail="Create a task to start tracking work."
                />
              )}
              {tasks.hasMore && (
                <Button
                  title="Load more tasks"
                  variant="secondary"
                  busy={tasks.loading}
                  onPress={tasks.more}
                />
              )}
            </>
          )}
          {can(user, "projects.delete") && (
            <Button
              title="Delete project"
              variant="danger"
              busy={deleting}
              onPress={() =>
                confirm(
                  "Delete this project?",
                  "Its tasks and memberships will also be deleted. This cannot be undone.",
                  async () => {
                    setDeleting(true);
                    try {
                      await api("/projects/" + id, { method: "DELETE" });
                      navigation.goBack();
                    } finally {
                      setDeleting(false);
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
