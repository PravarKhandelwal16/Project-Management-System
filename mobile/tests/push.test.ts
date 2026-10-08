import { test, expect, jest, beforeEach } from "@jest/globals";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  devicePushToken,
  pushTask,
  rememberPushToken,
  restorePushToken,
  peekPushToken,
  clearPushToken,
} from "../src/services/push";
beforeEach(() => {
  (Constants as any).executionEnvironment = "standalone";
  (Constants as any).easConfig = { projectId: "test-project" };
  jest.clearAllMocks();
});
test("Expo Go explains the build requirement without prompting or registering", async () => {
  (Constants as any).executionEnvironment = "storeClient";
  await expect(devicePushToken(true)).rejects.toThrow("Expo Go");
  expect(await devicePushToken(false)).toBeNull();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
test("permission is requested only through the explicit enable action", async () => {
  (Notifications.getPermissionsAsync as any).mockResolvedValue({
    granted: false,
  });
  expect(await devicePushToken(false)).toBeNull();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  (Notifications.requestPermissionsAsync as any).mockResolvedValue({
    granted: false,
  });
  await expect(devicePushToken(true)).rejects.toThrow("device settings");
});
test("registration creates the Android channel before requesting a project token", async () => {
  (Notifications.getPermissionsAsync as any).mockResolvedValue({
    granted: true,
  });
  (Notifications.getExpoPushTokenAsync as any).mockResolvedValue({
    data: "ExpoPushToken[device]",
  });
  expect(await devicePushToken(true)).toBe("ExpoPushToken[device]");
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
    "task-reminders",
    expect.objectContaining({ importance: 4 }),
  );
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
    projectId: "test-project",
  });
});
test("missing EAS configuration has an actionable error", async () => {
  (Constants as any).easConfig = {};
  await expect(devicePushToken(true)).rejects.toThrow("EAS project");
});
test("tap targets are valid tasks for the currently logged-in recipient only", () => {
  expect(pushTask({ type: "TASK_DUE_TOMORROW", taskId: 8, userId: 2 }, 2)).toBe(
    8,
  );
  for (const data of [
    { type: "TASK_DUE_TOMORROW", taskId: 8, userId: 3 },
    { type: "TASK_DUE_TOMORROW", taskId: "8", userId: 2 },
    { type: "TASK_DUE_TOMORROW", taskId: -1, userId: 2 },
    {},
  ])
    expect(pushTask(data, 2)).toBeNull();
});
test("stored device tokens can be restored and removed on logout", async () => {
  await rememberPushToken("ExpoPushToken[device]");
  expect(peekPushToken()).toBe("ExpoPushToken[device]");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    "projectmaster.push-token.v1",
    "ExpoPushToken[device]",
  );
  (SecureStore.getItemAsync as any).mockResolvedValue("ExpoPushToken[device]");
  expect(await restorePushToken()).toBe("ExpoPushToken[device]");
  await clearPushToken();
  expect(peekPushToken()).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
    "projectmaster.push-token.v1",
  );
});
