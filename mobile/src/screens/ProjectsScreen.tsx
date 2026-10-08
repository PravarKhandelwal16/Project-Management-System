import React, { useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { usePaged, useDebounced } from "../hooks/useData";
import { can } from "../services/permissions";
import { PROJECT_STATUS_VALUES } from "../shared";
import {
  Header,
  Field,
  Picker,
  Button,
  Empty,
  ErrorBox,
  Skeleton,
  styles,
  optionValues,
} from "../components/UI";
import { ProjectCard } from "../components/ResourceCards";
import { colors as c } from "../theme";
export function ProjectsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("created_at");
  const list = usePaged(can(user, "projects.view") ? "/projects" : null, {
    search: useDebounced(search),
    status,
    sortBy: sort,
    sortOrder: sort === "name" ? "ASC" : "DESC",
  });
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <FlatList
        data={list.rows}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={list.loading && !!list.rows.length}
            tintColor={c.blue}
            onRefresh={list.refresh}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <Header
              title="Projects"
              subtitle="Move your best work forward."
              action={
                can(user, "projects.view") && can(user, "projects.create") ? (
                  <Button
                    title="New"
                    icon={Plus}
                    onPress={() => navigation.navigate("ProjectForm")}
                  />
                ) : null
              }
            />
            <Field
              label="Search projects"
              value={search}
              onChangeText={setSearch}
            />
            <Picker
              label="Status"
              value={status}
              options={optionValues(PROJECT_STATUS_VALUES, "All statuses")}
              onChange={setStatus}
            />
            <Picker
              label="Sort by"
              value={sort}
              options={[
                "created_at",
                "name",
                "start_date",
                "end_date",
                "status",
              ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
              onChange={setSort}
            />
            {list.error && (
              <ErrorBox message={list.error} retry={list.refresh} />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() =>
              navigation.navigate("ProjectDetails", { id: item.id })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          list.loading ? (
            <Skeleton />
          ) : !list.error ? (
            <Empty
              title={
                can(user, "projects.view")
                  ? "No projects found"
                  : "Project access unavailable"
              }
              detail="Change your filters or ask your manager to add you to a project."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            {list.hasMore && (
              <Button
                title="Load more projects"
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
