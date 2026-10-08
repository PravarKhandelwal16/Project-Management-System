import React, { useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, SlidersHorizontal } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { usePaged, useDebounced, useData } from "../hooks/useData";
import { can } from "../services/permissions";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from "../shared";
import {
  Header,
  Field,
  Picker,
  Button,
  Sheet,
  DateField,
  Empty,
  ErrorBox,
  Skeleton,
  styles,
  optionValues,
} from "../components/UI";
import { ProjectPicker } from "../components/ProjectPicker";
import { TaskCard } from "../components/ResourceCards";
import type { Row } from "../types";
import { colors as c } from "../theme";
export function TasksScreen({ navigation }: any) {
  const { user } = useAuth(),
    [search, setSearch] = useState(""),
    [filters, setFilters] = useState<Row>({
      status: "",
      priority: "",
      project: null,
      assigned_to: user?.role === "member" ? user.id : "",
      due_date: null,
      overdue: false,
      sortBy: "created_at",
      order: "DESC",
    }),
    [draft, setDraft] = useState(filters),
    [open, setOpen] = useState(false);
  const project = useData(
    draft.project && open ? "/projects/" + draft.project.id : null,
  );
  const list = usePaged(
    can(user, "projects.view") && can(user, "tasks.view") ? "/tasks" : null,
    {
      search: useDebounced(search),
      status: filters.status,
      priority: filters.priority,
      project_id: filters.project?.id,
      assigned_to: filters.assigned_to,
      due_date: filters.due_date,
      overdue: filters.overdue ? "true" : "",
      sortBy: filters.sortBy,
      order: filters.order,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  );
  const active = [
    "status",
    "priority",
    "project",
    "assigned_to",
    "due_date",
    "overdue",
  ].filter((key) => filters[key]).length;
  const set = (key: string, value: any) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const assignees = [
    { label: "Anyone", value: "" },
    { label: "Assigned to me", value: user!.id },
    ...(project.data
      ? [
          { label: project.data.owner_name, value: project.data.user_id },
          ...project.data.members.map((m: any) => ({
            label: m.full_name,
            value: m.user_id,
          })),
        ]
      : []),
  ].filter(
    (item, index, array) =>
      array.findIndex((i) => i.value === item.value) === index,
  );
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <FlatList
        data={list.rows}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
              title="Tasks"
              subtitle="A little progress, every day."
              action={
                can(user, "projects.view") &&
                can(user, "tasks.view") &&
                can(user, "tasks.create") ? (
                  <Button
                    title="New"
                    icon={Plus}
                    onPress={() => navigation.navigate("TaskForm")}
                  />
                ) : null
              }
            />
            <Field
              label="Search tasks"
              value={search}
              onChangeText={setSearch}
            />
            <Button
              title={"Filters" + (active ? " (" + active + ")" : "")}
              icon={SlidersHorizontal}
              variant="secondary"
              onPress={() => {
                setDraft(filters);
                setOpen(true);
              }}
            />
            {list.error && (
              <ErrorBox message={list.error} retry={list.refresh} />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => navigation.navigate("TaskDetails", { id: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          list.loading ? (
            <Skeleton />
          ) : !list.error ? (
            <Empty
              title="No matching tasks"
              detail="Try clearing filters or create a task in an accessible project."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            {list.hasMore && (
              <Button
                title="Load more tasks"
                variant="secondary"
                busy={list.loading}
                onPress={list.more}
              />
            )}
          </View>
        }
      />
      <Sheet open={open} title="Filter tasks" onClose={() => setOpen(false)}>
        <Picker
          label="Status"
          value={draft.status}
          options={optionValues(TASK_STATUS_VALUES, "All statuses")}
          onChange={(v) => set("status", v)}
        />
        <Picker
          label="Priority"
          value={draft.priority}
          options={optionValues(TASK_PRIORITY_VALUES, "All priorities")}
          onChange={(v) => set("priority", v)}
        />
        <ProjectPicker
          value={draft.project}
          allowAll
          onChange={(p) => {
            setDraft((d) => ({ ...d, project: p, assigned_to: "" }));
          }}
        />
        {project.error && (
          <ErrorBox message={project.error} retry={project.refresh} />
        )}
        <Picker
          label="Assignee"
          value={draft.assigned_to}
          options={assignees}
          onChange={(v) => set("assigned_to", v)}
        />
        <DateField
          label="Due date"
          value={draft.due_date}
          onChange={(v: any) => set("due_date", v)}
        />
        <Picker
          label="Overdue"
          value={draft.overdue}
          options={[
            { label: "All dates", value: false },
            { label: "Overdue only", value: true },
          ]}
          onChange={(v) => set("overdue", v)}
        />
        <Picker
          label="Sort by"
          value={draft.sortBy}
          options={["name", "priority", "status", "due_date", "created_at"].map(
            (value) => ({ label: value.replaceAll("_", " "), value }),
          )}
          onChange={(v) => set("sortBy", v)}
        />
        <Picker
          label="Order"
          value={draft.order}
          options={[
            { label: "Ascending", value: "ASC" },
            { label: "Descending", value: "DESC" },
          ]}
          onChange={(v) => set("order", v)}
        />
        <Button
          title="Apply filters"
          onPress={() => {
            setFilters(draft);
            setOpen(false);
          }}
        />
        <Button
          title="Clear filters"
          variant="secondary"
          onPress={() => {
            const cleared = {
              status: "",
              priority: "",
              project: null,
              assigned_to: "",
              due_date: null,
              overdue: false,
              sortBy: "created_at",
              order: "DESC",
            };
            setFilters(cleared);
            setDraft(cleared);
            setOpen(false);
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}
