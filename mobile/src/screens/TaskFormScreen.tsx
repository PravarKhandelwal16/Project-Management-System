import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../hooks/useData";
import { can, canChangeStatus } from "../services/permissions";
import {
  TASK_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
  createTaskSchema,
  updateTaskSchema,
} from "../shared";
import {
  Page,
  Header,
  Field,
  Picker,
  DateField,
  Button,
  Skeleton,
  ErrorBox,
  optionValues,
} from "../components/UI";
import { ProjectPicker } from "../components/ProjectPicker";
import type { Row } from "../types";
export function TaskFormScreen({ route, navigation }: any) {
  const id = route.params?.id,
    { api, user } = useAuth(),
    existing = useData(id ? "/tasks/" + id : null),
    [selected, setSelected] = useState<Row | null>(
      route.params?.projectId
        ? { id: route.params.projectId, name: "Loading project..." }
        : null,
    );
  const project = useData(selected ? "/projects/" + selected.id : null);
  const [form, setForm] = useState({
      name: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      due_date: null as string | null,
      assigned_to: null as number | null,
    }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (existing.data) {
      const t = existing.data;
      setForm({
        name: t.name,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        assigned_to: t.assigned_to,
      });
      setSelected({ id: t.project_id, name: t.project_name });
    }
  }, [existing.data]);
  useEffect(() => {
    if (project.data)
      setSelected((p) =>
        p?.name === project.data.name
          ? p
          : { id: project.data.id, name: project.data.name },
      );
  }, [project.data]);
  const set = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));
  const eligible = project.data
    ? [
        { label: "Unassigned", value: null },
        { label: project.data.owner_name, value: project.data.user_id },
        ...project.data.members
          .filter((m: any) => m.is_active)
          .map((m: any) => ({ label: m.full_name, value: m.user_id })),
      ]
    : [{ label: "Unassigned", value: null }];
  const submit = async () => {
    const body: Row = { ...form, ...(!id ? { project_id: selected?.id } : {}) };
    if (!can(user, "tasks.assign")) delete body.assigned_to;
    if (id && existing.data && !canChangeStatus(user, existing.data))
      delete body.status;
    const parsed = (id ? updateTaskSchema : createTaskSchema).safeParse(body);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    setErrors({});
    setError("");
    setBusy(true);
    try {
      const result = await api("/tasks" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: parsed.data,
      });
      if (id) navigation.goBack();
      else navigation.replace("TaskDetails", { id: result.data.id });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page form>
      <Header
        title={id ? "Edit task" : "New task"}
        subtitle="Turn a clear next step into progress."
      />
      {existing.error && (
        <ErrorBox message={existing.error} retry={existing.refresh} />
      )}
      {project.error && (
        <ErrorBox message={project.error} retry={project.refresh} />
      )}
      {error && <ErrorBox message={error} />}
      {id && existing.loading && !existing.data ? (
        <Skeleton />
      ) : (
        (!id || existing.data) && (
          <>
            <ProjectPicker
              value={selected}
              disabled={!!id}
              onChange={(p) => {
                setSelected(p);
                set("assigned_to", null);
              }}
            />
            {errors.project_id && (
              <ErrorBox message="Select an accessible project." />
            )}
            <Field
              label="Task name"
              value={form.name}
              onChangeText={(v: string) => set("name", v)}
              error={errors.name}
            />
            <Field
              label="Description"
              multiline
              value={form.description}
              onChangeText={(v: string) => set("description", v)}
              error={errors.description}
            />
            {(!id ||
              (existing.data && canChangeStatus(user, existing.data))) && (
              <Picker
                label="Status"
                value={form.status}
                options={optionValues(TASK_STATUS_VALUES)}
                onChange={(v) => set("status", v)}
              />
            )}
            <Picker
              label="Priority"
              value={form.priority}
              options={optionValues(TASK_PRIORITY_VALUES)}
              onChange={(v) => set("priority", v)}
            />
            <DateField
              label="Due date"
              value={form.due_date}
              onChange={(v: any) => set("due_date", v)}
            />
            {errors.due_date && <ErrorBox message={errors.due_date} />}
            {can(user, "tasks.assign") && (
              <Picker
                label="Assignee"
                disabled={!project.data}
                value={form.assigned_to}
                options={eligible}
                onChange={(v) => set("assigned_to", v)}
              />
            )}
            <Button
              title="Save task"
              busy={busy}
              disabled={!project.data}
              onPress={submit}
            />
          </>
        )
      )}
    </Page>
  );
}
