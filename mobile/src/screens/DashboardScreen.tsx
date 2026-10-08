import React from "react";
import { View } from "react-native";
import {
  Bell,
  FolderKanban,
  CheckSquare,
  CheckCircle2,
  Clock3,
  AlertCircle,
  TrendingUp,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useData } from "../hooks/useData";
import { can } from "../services/permissions";
import { roleLabel } from "../shared";
import {
  Page,
  Txt,
  Header,
  IconButton,
  Avatar,
  Card,
  Section,
  Button,
  Skeleton,
  ErrorBox,
  Empty,
  styles,
} from "../components/UI";
import { ProjectCard, TaskCard } from "../components/ResourceCards";
import { colors as c, fonts } from "../theme";
export function DashboardScreen({ navigation }: any) {
  const { user } = useAuth(),
    notifications = useNotifications();
  const report = useData(
    can(user, "projects.view")
      ? "/dashboard?tz=" +
          encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)
      : null,
  );
  const d = report.data,
    summary = d?.summary;
  const metrics = [
    ["Projects", "totalProjects", FolderKanban, c.blue],
    ["Tasks", "totalTasks", CheckSquare, c.cyan],
    ["Completed", "completedTasks", CheckCircle2, c.green],
    ["In progress", "inProgressTasks", TrendingUp, c.blue],
    ["Due today", "dueToday", Clock3, c.amber],
    ["Overdue", "overdueTasks", AlertCircle, c.red],
  ] as const;
  return (
    <Page
      refresh={() => {
        void report.refresh();
        void notifications.refresh().catch(() => {});
      }}
      refreshing={report.loading && !!d}
    >
      <View style={styles.between}>
        <View style={styles.row}>
          <Avatar name={user!.full_name} />
          <View>
            <Txt muted>{roleLabel(user!.role)}</Txt>
            <Txt style={{ fontFamily: fonts.bold }}>
              Hi, {user!.full_name.split(" ")[0]}
            </Txt>
          </View>
        </View>
        <IconButton
          icon={Bell}
          label="Notifications"
          badge={notifications.count}
          onPress={() => navigation.navigate("Notifications")}
        />
      </View>
      <Header
        title="Your workspace"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />
      {report.error && (
        <ErrorBox message={report.error} retry={report.refresh} />
      )}
      {report.loading && !d && <Skeleton />}
      {!can(user, "projects.view") && (
        <Empty
          title="Workspace access limited"
          detail="Your administrator can update your project permissions."
        />
      )}
      {d && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {metrics
              .filter((m, i) => i === 0 || can(user, "tasks.view"))
              .map(([label, key, Icon, color]) => (
                <Card
                  key={key}
                  style={{ width: "47%", flexGrow: 1, padding: 16 }}
                >
                  <View style={styles.between}>
                    <Icon size={20} color={color} />
                    <Txt
                      style={{
                        fontSize: 28,
                        lineHeight: 36,
                        fontFamily: fonts.bold,
                      }}
                    >
                      {summary[key]}
                    </Txt>
                  </View>
                  <Txt muted>{label}</Txt>
                </Card>
              ))}
          </View>
          <Section
            title="Active projects"
            action={
              <Button
                title="View all"
                variant="secondary"
                onPress={() => navigation.navigate("Projects")}
              />
            }
          />
          {d.projects
            .filter((p: any) => p.status !== "Completed")
            .slice(0, 3)
            .map((p: any) => (
              <ProjectCard
                key={p.id}
                project={p}
                onPress={() =>
                  navigation.navigate("ProjectDetails", { id: p.id })
                }
              />
            ))}
          {!d.projects.some((p: any) => p.status !== "Completed") && (
            <Empty
              title="No active projects"
              detail="Your accessible projects will appear here."
            />
          )}
          {can(user, "tasks.view") && (
            <>
              <Section title="Coming up" />
              {d.upcomingTasks.slice(0, 3).map((t: any) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onPress={() =>
                    navigation.navigate("TaskDetails", { id: t.id })
                  }
                />
              ))}
              {!d.upcomingTasks.length && (
                <Empty
                  title="No upcoming deadlines"
                  detail="You're all caught up."
                />
              )}
              <Section title="Needs attention" />
              {d.overdueTasks.slice(0, 3).map((t: any) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onPress={() =>
                    navigation.navigate("TaskDetails", { id: t.id })
                  }
                />
              ))}
              {!d.overdueTasks.length && <Txt muted>No overdue tasks.</Txt>}
              <Section title="Recent activity" />
              <Card>
                {d.taskActivity.slice(-7).map((day: any) => (
                  <View key={day.date} style={styles.between}>
                    <Txt muted>{day.date.slice(5)}</Txt>
                    <Txt>
                      {day.created} created / {day.completed} completed
                    </Txt>
                  </View>
                ))}
                <Txt muted>
                  Daily task activity across your permitted projects.
                </Txt>
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}
