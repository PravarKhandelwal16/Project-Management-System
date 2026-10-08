import React, { useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { usePaged } from "../hooks/useData";
import {
  Header,
  Card,
  Txt,
  Badge,
  Button,
  Empty,
  ErrorBox,
  Skeleton,
  styles,
  displayDate,
} from "../components/UI";
import { colors as c } from "../theme";
export function NotificationsScreen({ navigation }: any) {
  const { api } = useAuth(),
    badge = useNotifications(),
    list = usePaged("/notifications", {}, "offset"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = () => {
    void list.refresh();
    void badge.refresh().catch(() => {});
  };
  const mark = async (id?: number) => {
    setBusy(true);
    setError("");
    try {
      await api("/notifications/" + (id ? id + "/read" : "read-all"), {
        method: "PATCH",
      });
      await list.refresh();
      await badge.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const open = async (n: any) => {
    await mark(n.id);
    const type = String(n.resource_type || "").toUpperCase(),
      id = Number(n.resource_id);
    if (type === "TASK" && id) navigation.navigate("TaskDetails", { id });
    else if (type === "PROJECT" && id)
      navigation.navigate("ProjectDetails", { id });
  };
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <FlatList
        data={list.rows}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={c.blue}
            refreshing={list.loading && !!list.rows.length}
            onRefresh={refresh}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <Header
              title="Notifications"
              subtitle="Stay close to what matters."
            />
            <Button
              title="Mark all as read"
              busy={busy}
              disabled={!badge.count}
              variant="secondary"
              onPress={() => {
                void mark();
              }}
            />
            {(list.error || error) && (
              <ErrorBox message={error || list.error} retry={refresh} />
            )}
          </View>
        }
        renderItem={({ item: n }) => (
          <Card
            onPress={() => {
              void open(n);
            }}
            label={"Open notification " + n.title}
            style={{ borderColor: n.is_read ? c.border : c.blue }}
          >
            <View style={styles.between}>
              <Badge value={n.is_read ? "Read" : "Unread"} />
              <Txt muted>{displayDate(n.created_at)}</Txt>
            </View>
            <Txt heading>{n.title}</Txt>
            <Txt muted>{n.message}</Txt>
            {!n.is_read && (
              <Button
                title="Mark as read"
                variant="secondary"
                busy={busy}
                onPress={() => {
                  void mark(n.id);
                }}
              />
            )}
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          list.loading ? (
            <Skeleton />
          ) : !list.error ? (
            <Empty
              title="You're all caught up"
              detail="Task assignments and deadline reminders will appear here."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            {list.hasMore && (
              <Button
                title="Load more notifications"
                variant="secondary"
                busy={list.loading}
                onPress={list.more}
              />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
