import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback } from "react";
import {
  NavigationContainer,
  DarkTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Ellipsis,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { can, canAdmin } from "../services/permissions";
import { colors as c, fonts } from "../theme";
import { Page, Empty, ErrorBox, Skeleton } from "../components/UI";
import { AuthScreen } from "../screens/AuthScreens";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ProjectsScreen } from "../screens/ProjectsScreen";
import { ProjectDetailsScreen } from "../screens/ProjectDetailsScreen";
import { ProjectFormScreen } from "../screens/ProjectFormScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { TaskDetailsScreen } from "../screens/TaskDetailsScreen";
import { TaskFormScreen } from "../screens/TaskFormScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { TeamScreen } from "../screens/TeamScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import {
  AdminUsersScreen,
  UserDetailsScreen,
  RolesScreen,
  AuditLogsScreen,
} from "../screens/AdminScreens";
import type { RootParams } from "../types";
const Stack = createNativeStackNavigator<RootParams>(),
  Auth = createNativeStackNavigator(),
  Tabs = createBottomTabNavigator();
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: c.blue,
    background: c.background,
    card: c.background,
    text: c.text,
    border: c.border,
    notification: c.primary,
  },
};
function Guard({
  component: Component,
  required = [],
  admin,
  mode,
  ...props
}: any) {
  const { user, refreshUser } = useAuth();
  useFocusEffect(
    useCallback(() => {
      void refreshUser().catch(() => {});
    }, [refreshUser]),
  );
  const actionPermission =
    mode === "projectForm"
      ? props.route.params?.id
        ? "projects.edit"
        : "projects.create"
      : mode === "taskForm"
        ? props.route.params?.id
          ? "tasks.edit"
          : "tasks.create"
        : null;
  const allowed =
    required.every((p: string) => can(user, p)) &&
    (!admin || canAdmin(user, admin)) &&
    (!actionPermission || can(user, actionPermission));
  return allowed ? (
    <Component {...props} />
  ) : (
    <Page>
      <Empty
        title="Access unavailable"
        detail="Your permissions have changed or this screen is outside your role. Ask an administrator if you need access."
      />
    </Page>
  );
}
function HomeTabs() {
  const { count } = useNotifications();
  const screens = [
    ["Dashboard", DashboardScreen, LayoutDashboard, []],
    ["Projects", ProjectsScreen, FolderKanban, ["projects.view"]],
    ["Tasks", TasksScreen, CheckSquare, ["projects.view", "tasks.view"]],
    ["Notifications", NotificationsScreen, Bell, []],
    ["More", MoreScreen, Ellipsis, []],
  ] as const;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={["top"]}
    >
      <Tabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.blue,
          tabBarInactiveTintColor: c.muted,
          tabBarStyle: {
            backgroundColor: c.card,
            borderTopColor: c.border,
            minHeight: 70,
          },
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
          tabBarItemStyle: { paddingVertical: 8 },
        }}
      >
        {screens.map(([name, Component, Icon, required]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              tabBarIcon: ({ color }) => <Icon color={color} size={21} />,
              ...(name === "Notifications" && count
                ? { tabBarBadge: count > 99 ? "99+" : count }
                : {}),
            }}
          >
            {(props) => (
              <Guard {...props} component={Component} required={required} />
            )}
          </Tabs.Screen>
        ))}
      </Tabs.Navigator>
    </SafeAreaView>
  );
}
export function AppNavigator() {
  const auth = useAuth();
  if (auth.initializing)
    return (
      <Page>
        <Skeleton />
      </Page>
    );
  if (auth.startupError)
    return (
      <Page>
        <ErrorBox message={auth.startupError} retry={auth.retry} />
      </Page>
    );
  const screens = [
    [
      "ProjectDetails",
      ProjectDetailsScreen,
      ["projects.view"],
      "Project",
      null,
      null,
    ],
    [
      "ProjectForm",
      ProjectFormScreen,
      ["projects.view"],
      "Project form",
      null,
      "projectForm",
    ],
    [
      "TaskDetails",
      TaskDetailsScreen,
      ["projects.view", "tasks.view"],
      "Task",
      null,
      null,
    ],
    [
      "TaskForm",
      TaskFormScreen,
      ["projects.view", "tasks.view"],
      "Task form",
      null,
      "taskForm",
    ],
    [
      "Analytics",
      AnalyticsScreen,
      ["projects.view", "tasks.view", "analytics.view"],
      "Analytics",
      null,
      null,
    ],
    ["Team", TeamScreen, ["projects.view", "team.view"], "Team", null, null],
    ["Settings", SettingsScreen, [], "Settings", null, null],
    ["AdminUsers", AdminUsersScreen, [], "User management", "users.view", null],
    ["UserDetails", UserDetailsScreen, [], "User details", "users.view", null],
    ["Roles", RolesScreen, [], "Roles and permissions", "roles.manage", null],
    ["AuditLogs", AuditLogsScreen, [], "Audit logs", "audit.view", null],
  ] as const;
  return (
    <NavigationContainer theme={theme}>
      {auth.user ? (
        <Stack.Navigator
          key={auth.user.id}
          screenOptions={{
            headerStyle: { backgroundColor: c.background },
            headerTintColor: c.text,
            headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
            contentStyle: { backgroundColor: c.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeTabs}
            options={{ headerShown: false }}
          />
          {screens.map(([name, Component, required, title, admin, mode]) => (
            <Stack.Screen key={name} name={name} options={{ title }}>
              {(props) => (
                <Guard
                  {...props}
                  component={Component}
                  required={required}
                  admin={admin}
                  mode={mode}
                />
              )}
            </Stack.Screen>
          ))}
        </Stack.Navigator>
      ) : (
        <Auth.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.background },
            animation: "fade",
          }}
        >
          <Auth.Screen name="Login" component={AuthScreen} />
          <Auth.Screen name="Register" component={AuthScreen} />
        </Auth.Navigator>
      )}
    </NavigationContainer>
  );
}
