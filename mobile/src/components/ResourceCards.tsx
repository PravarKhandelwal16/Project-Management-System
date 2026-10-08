import React from "react";
import { View } from "react-native";
import { CalendarDays, Users, CheckSquare } from "lucide-react-native";
import { Card, Txt, Badge, Progress, styles, Avatar, displayDate } from "./UI";
import { colors as c } from "../theme";
import type { Row } from "../types";
export function ProjectCard({
  project: p,
  onPress,
}: {
  project: Row;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} label={"Open project " + p.name}>
      <View style={styles.between}>
        <Txt heading style={{ flex: 1 }}>
          {p.name}
        </Txt>
        <Badge value={p.status} />
      </View>
      <Txt muted numberOfLines={2}>
        {p.description || "No description added."}
      </Txt>
      <Progress value={p.progress} />
      <View style={styles.wrap}>
        <View style={styles.row}>
          <CalendarDays size={14} color={c.muted} />
          <Txt muted>
            {displayDate(p.start_date)} - {displayDate(p.end_date)}
          </Txt>
        </View>
        <View style={styles.row}>
          <Users size={14} color={c.muted} />
          <Txt muted>
            {Number(p.member_count ?? (p.team_size ? p.team_size - 1 : 0)) + 1}{" "}
            members
          </Txt>
        </View>
        {p.total_tasks !== null && p.total_tasks !== undefined && (
          <View style={styles.row}>
            <CheckSquare size={14} color={c.muted} />
            <Txt muted>
              {p.completed_tasks}/{p.total_tasks} tasks
            </Txt>
          </View>
        )}
      </View>
    </Card>
  );
}
export function TaskCard({
  task: t,
  onPress,
}: {
  task: Row;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} label={"Open task " + t.name}>
      <View style={styles.wrap}>
        <Badge value={t.status} />
        <Badge value={t.priority} />
      </View>
      <Txt heading>{t.name}</Txt>
      <Txt muted>{t.project_name}</Txt>
      <View style={styles.between}>
        <View style={styles.row}>
          <Avatar name={t.assignee_name || "Unassigned"} size={28} />
          <Txt muted style={{ flexShrink: 1 }}>
            {t.assignee_name || "Unassigned"}
          </Txt>
        </View>
        <Txt muted>{displayDate(t.due_date)}</Txt>
      </View>
    </Card>
  );
}
