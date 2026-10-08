import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type * as NotificationsType from "expo-notifications";
const key = "projectmaster.push-token.v1";
let knownToken: string | null = null;
export const peekPushToken = () => knownToken;
export async function clearPushToken() {
  knownToken = null;
  await SecureStore.deleteItemAsync(key);
}
export const pushAvailable = () =>
  Constants.executionEnvironment !== "storeClient" &&
  Device.isDevice &&
  ["android", "ios"].includes(Platform.OS);
// Do not load the remote push module in Expo Go, where Android push is unsupported.
export const notifications = (): typeof NotificationsType =>
  require("expo-notifications");
export function pushTask(data: any, userId: number): number | null {
  return data?.type === "TASK_DUE_TOMORROW" &&
    data.userId === userId &&
    Number.isSafeInteger(data.taskId) &&
    data.taskId > 0
    ? data.taskId
    : null;
}
export async function devicePushToken(prompt: boolean): Promise<string | null> {
  if (!pushAvailable()) {
    if (prompt)
      throw new Error(
        "Push reminders require a development build or APK on a physical device. Expo Go is not supported.",
      );
    return null;
  }
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    if (prompt)
      throw new Error(
        "Link this app to an EAS project and rebuild it to enable push reminders.",
      );
    return null;
  }
  const n = notifications();
  if (Platform.OS === "android")
    await n.setNotificationChannelAsync("task-reminders", {
      name: "Task reminders",
      importance: n.AndroidImportance.HIGH,
      sound: "default",
    });
  let permission = await n.getPermissionsAsync();
  if (!permission.granted && prompt)
    permission = await n.requestPermissionsAsync();
  if (!permission.granted) {
    if (prompt)
      throw new Error(
        "Notifications are disabled. Allow them in your device settings, then try again.",
      );
    return null;
  }
  const result = await n.getExpoPushTokenAsync({ projectId });
  return result.data;
}
export async function rememberPushToken(token: string) {
  knownToken = token;
  await SecureStore.setItemAsync(key, token);
}
export async function restorePushToken() {
  const value = await SecureStore.getItemAsync(key);
  knownToken =
    value && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value)
      ? value
      : null;
  return knownToken;
}
