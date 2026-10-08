import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { usePush } from "../context/PushContext";
import { useAuth } from "../context/AuthContext";
import { useData } from "../hooks/useData";
import { roleLabel, updatePreferencesSchema } from "../shared";
import {
  Page,
  Header,
  Card,
  Txt,
  Button,
  Skeleton,
  ErrorBox,
  styles,
} from "../components/UI";
import { colors as c } from "../theme";
const preferences = [
  ["Email", "email_task_assigned", "Task assignments"],
  ["Email", "email_due_tomorrow", "Due tomorrow"],
  ["Email", "email_overdue", "Overdue tasks"],
  ["In-app inbox (web and mobile)", "web_task_assigned", "Task assignments"],
  ["In-app inbox (web and mobile)", "web_due_tomorrow", "Due tomorrow"],
  ["In-app inbox (web and mobile)", "web_overdue", "Overdue tasks"],
  ["Web browser only", "browser_task_assigned", "Task assignments"],
  ["Web browser only", "browser_due_tomorrow", "Due tomorrow"],
];
export function SettingsScreen() {
  const push = usePush();
  const { user, api } = useAuth(),
    existing = useData("/notifications/preferences"),
    [values, setValues] = useState<Record<string, boolean>>({}),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (existing.data)
      setValues(
        Object.fromEntries(
          preferences.map(([, key]) => [key, Boolean(existing.data[key])]),
        ),
      );
  }, [existing.data]);
  const save = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const parsed = updatePreferencesSchema.parse(values);
      await api("/notifications/preferences", { method: "PUT", body: parsed });
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      refresh={existing.refresh}
      refreshing={existing.loading && !!existing.data}
    >
      <Header title="Settings" subtitle="Make your workspace work for you." />
      <Card>
        <Txt heading>{user!.full_name}</Txt>
        <Txt muted>{user!.email}</Txt>
        <Txt>{roleLabel(user!.role)}</Txt>
      </Card>
      {existing.error && (
        <ErrorBox message={existing.error} retry={existing.refresh} />
      )}
      {error && <ErrorBox message={error} />}
      {existing.loading && !existing.data ? (
        <Skeleton />
      ) : (
        existing.data && (
          <>
            {Array.from(new Set(preferences.map((p) => p[0]))).map((group) => (
              <Card key={group}>
                <Txt heading>{group}</Txt>
                {preferences
                  .filter((p) => p[0] === group)
                  .map(([, key, label]) => (
                    <View key={key} style={styles.between}>
                      <Txt style={{ flex: 1 }}>{label}</Txt>
                      <Switch
                        accessibilityLabel={group + ": " + label}
                        value={values[key] ?? false}
                        trackColor={{ false: c.border, true: c.primary }}
                        thumbColor={c.text}
                        onValueChange={(value) => {
                          setValues({ ...values, [key]: value });
                          setSaved(false);
                        }}
                      />
                    </View>
                  ))}
              </Card>
            ))}
            <Card>
              <Txt heading>Mobile push notifications</Txt>
              <Txt muted>
                Receive a push reminder for your incomplete tasks due tomorrow,
                even when the app is closed. Reminders use the server's
                scheduled time and timezone. A development build or APK is
                required.
              </Txt>
              <Txt>
                Due tomorrow:{" "}
                {existing.data.push_due_tomorrow ? "Enabled" : "Disabled"}
              </Txt>
              {push.error && <ErrorBox message={push.error} />}
              <Button
                title={
                  existing.data.push_due_tomorrow
                    ? "Disable push reminders"
                    : "Enable push reminders"
                }
                busy={push.busy}
                onPress={async () => {
                  try {
                    await (existing.data.push_due_tomorrow
                      ? push.disable()
                      : push.enable());
                    await existing.refresh();
                  } catch {}
                }}
              />
              {Boolean(existing.data.push_due_tomorrow) && (
                <Button
                  title="Register this device"
                  variant="secondary"
                  busy={push.busy}
                  onPress={async () => {
                    try {
                      await push.enable();
                      await existing.refresh();
                    } catch {}
                  }}
                />
              )}
            </Card>
            {saved && (
              <Txt style={{ color: c.green }} accessibilityRole="alert">
                Preferences saved.
              </Txt>
            )}
            <Button title="Save preferences" busy={busy} onPress={save} />
          </>
        )
      )}
    </Page>
  );
}
