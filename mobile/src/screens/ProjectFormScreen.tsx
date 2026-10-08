import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../hooks/useData";
import {
  PROJECT_STATUS_VALUES,
  createProjectSchema,
  updateProjectSchema,
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
export function ProjectFormScreen({ route, navigation }: any) {
  const id = route.params?.id,
    { api } = useAuth(),
    existing = useData(id ? "/projects/" + id : null);
  const [form, setForm] = useState({
      name: "",
      description: "",
      status: "Not Started",
      start_date: null as string | null,
      end_date: null as string | null,
    }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (existing.data) {
      const p = existing.data;
      setForm({
        name: p.name,
        description: p.description || "",
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
      });
    }
  }, [existing.data]);
  const set = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async () => {
    const parsed = (id ? updateProjectSchema : createProjectSchema).safeParse(
      form,
    );
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
      const result = await api("/projects" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: parsed.data,
      });
      if (id) navigation.goBack();
      else navigation.replace("ProjectDetails", { id: result.data.id });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page form>
      <Header
        title={id ? "Edit project" : "New project"}
        subtitle="Give your team a clear starting point."
      />
      {existing.error && (
        <ErrorBox message={existing.error} retry={existing.refresh} />
      )}
      {error && <ErrorBox message={error} />}
      {id && existing.loading && !existing.data ? (
        <Skeleton />
      ) : (
        (!id || existing.data) && (
          <>
            <Field
              label="Project name"
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
            <Picker
              label="Status"
              value={form.status}
              options={optionValues(PROJECT_STATUS_VALUES)}
              onChange={(v: string) => set("status", v)}
            />
            <DateField
              label="Start date"
              value={form.start_date}
              onChange={(v: any) => set("start_date", v)}
            />
            <DateField
              label="End date"
              value={form.end_date}
              onChange={(v: any) => set("end_date", v)}
            />
            {(errors.start_date || errors.end_date) && (
              <ErrorBox message={errors.start_date || errors.end_date} />
            )}
            <Button title="Save project" busy={busy} onPress={submit} />
          </>
        )
      )}
    </Page>
  );
}
