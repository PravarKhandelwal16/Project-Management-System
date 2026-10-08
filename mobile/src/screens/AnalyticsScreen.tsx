import React, { useState } from "react";
import { View } from "react-native";
import { useData } from "../hooks/useData";
import {
  Page,
  Header,
  Card,
  Txt,
  Section,
  Picker,
  Skeleton,
  ErrorBox,
  Progress,
  Empty,
  styles,
} from "../components/UI";
import { ProjectPicker } from "../components/ProjectPicker";
import type { Row } from "../types";
import { colors as c, tone } from "../theme";
function Bars({ rows, labelKey }: any) {
  const total = rows.reduce((sum: number, r: any) => sum + Number(r.count), 0);
  return (
    <Card>
      {rows.map((r: any) => (
        <View key={r[labelKey]} style={{ gap: 6 }}>
          <View style={styles.between}>
            <Txt>{r[labelKey]}</Txt>
            <Txt muted>{r.count}</Txt>
          </View>
          <View
            style={{
              height: 7,
              backgroundColor: c.raised,
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 7,
                width: `${total ? (r.count / total) * 100 : 0}%`,
                backgroundColor: tone(r[labelKey]),
              }}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}
export function AnalyticsScreen() {
  const [days, setDays] = useState(30),
    [project, setProject] = useState<Row | null>(null);
  const report = useData(
    "/analytics?days=" +
      days +
      (project ? "&project_id=" + project.id : "") +
      "&tz=" +
      encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  const d = report.data;
  const weekly = d?.taskActivity.reduce(
    (result: Row[], day: Row, index: number) => {
      if (index % 7 === 0)
        result.push({ date: day.date, created: 0, completed: 0 });
      result[result.length - 1].created += day.created;
      result[result.length - 1].completed += day.completed;
      return result;
    },
    [],
  );
  return (
    <Page refresh={report.refresh} refreshing={report.loading && !!d}>
      <Header title="Analytics" subtitle="A clear view of delivery." />
      <ProjectPicker value={project} onChange={setProject} allowAll />
      <Picker
        label="Activity period"
        value={days}
        options={[7, 30, 90].map((value) => ({
          value,
          label: "Last " + value + " days",
        }))}
        onChange={setDays}
      />
      {report.error && (
        <ErrorBox message={report.error} retry={report.refresh} />
      )}
      {report.loading && !d && <Skeleton />}
      {d && (
        <>
          <Card>
            <Txt heading>{d.summary.completionRate}% task completion</Txt>
            <Progress value={d.summary.completionRate} />
            <Txt muted>
              {d.summary.completedTasks} completed / {d.summary.totalTasks}{" "}
              tasks
            </Txt>
            <Txt muted>
              {d.summary.overdueTasks} overdue / {d.summary.totalProjects}{" "}
              projects
            </Txt>
          </Card>
          <Section title="Task status" />
          <Bars rows={d.taskStatus} labelKey="status" />
          <Section title="Task priority" />
          <Bars rows={d.priorities} labelKey="priority" />
          <Section title="Project status" />
          <Bars
            rows={["Not Started", "In Progress", "Completed"].map((status) => ({
              status,
              count: d.projects.filter((p: any) => p.status === status).length,
            }))}
            labelKey="status"
          />
          <Section title="Project distribution" />
          {d.projects.map((p: any) => (
            <Card key={p.id}>
              <Txt heading>{p.name}</Txt>
              <Progress value={p.progress} />
              <Txt muted>
                {p.total_tasks} tasks / {p.completed_tasks} completed
              </Txt>
            </Card>
          ))}
          {!d.projects.length && (
            <Empty
              title="No reporting data"
              detail="Reports include only projects you can access."
            />
          )}
          <Section title="Weekly task activity" />
          <Card>
            {weekly.map((week: any) => (
              <View key={week.date} style={{ gap: 5 }}>
                <View style={styles.between}>
                  <Txt muted>From {week.date}</Txt>
                  <Txt>
                    {week.created} created / {week.completed} done
                  </Txt>
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <View
                    style={{
                      height: 8,
                      width: Math.min(100, week.created * 8),
                      backgroundColor: c.blue,
                      borderRadius: 4,
                    }}
                  />
                  <View
                    style={{
                      height: 8,
                      width: Math.min(100, week.completed * 8),
                      backgroundColor: c.green,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            ))}
            <Txt muted>
              Blue: created. Green: completed. Activity is grouped in your
              device's time zone.
            </Txt>
          </Card>
          <Txt muted>
            Status counts show current totals. The selected period applies to
            recorded task activity.
          </Txt>
        </>
      )}
    </Page>
  );
}
