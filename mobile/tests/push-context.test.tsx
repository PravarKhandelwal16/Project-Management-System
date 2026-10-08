import React from "react";
import { Button, Text } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { jest, test, expect, beforeEach } from "@jest/globals";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../src/context/AuthContext";
import { useNotifications } from "../src/context/NotificationContext";
import { PushProvider, usePush } from "../src/context/PushContext";
import { clearPushToken } from "../src/services/push";
jest.mock("../src/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../src/context/NotificationContext", () => ({
  useNotifications: jest.fn(),
}));
const api = jest.fn<any>(),
  refresh = jest.fn<any>();
function Probe() {
  const p = usePush();
  return (
    <>
      <Text>{p.error}</Text>
      <Text>{JSON.stringify(p.target)}</Text>
      <Button
        title="enable"
        onPress={() => {
          void p.enable().catch(() => {});
        }}
      />
      <Button
        title="disable"
        onPress={() => {
          void p.disable().catch(() => {});
        }}
      />
    </>
  );
}
beforeEach(async () => {
  await clearPushToken();
  jest.clearAllMocks();
  (Constants as any).executionEnvironment = "standalone";
  (Constants as any).easConfig = { projectId: "test-project" };
  (SecureStore.getItemAsync as any).mockResolvedValue(null);
  (SecureStore.setItemAsync as any).mockResolvedValue(undefined);
  (Notifications.getPermissionsAsync as any).mockResolvedValue({
    granted: false,
  });
  (Notifications.requestPermissionsAsync as any).mockResolvedValue({
    granted: true,
  });
  (Notifications.getExpoPushTokenAsync as any).mockResolvedValue({
    data: "ExpoPushToken[device]",
  });
  (Notifications.getLastNotificationResponse as any).mockReturnValue(null);
  api.mockResolvedValue({ success: true });
  refresh.mockResolvedValue(undefined);
  (useAuth as any).mockReturnValue({ user: { id: 1 }, api });
  (useNotifications as any).mockReturnValue({ refresh });
});
test("explicit enable registers a device then enables the account preference; disable deregisters", async () => {
  const view = render(
    <PushProvider>
      <Probe />
    </PushProvider>,
  );
  await waitFor(() =>
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled(),
  );
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("ENABLE"));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/notifications/preferences", {
      method: "PUT",
      body: { push_due_tomorrow: true },
    }),
  );
  expect(api).toHaveBeenCalledWith("/notifications/push-devices", {
    method: "POST",
    body: { token: "ExpoPushToken[device]", platform: "android" },
  });
  fireEvent.press(view.getByText("DISABLE"));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/notifications/push-devices", {
      method: "DELETE",
      body: { token: "ExpoPushToken[device]" },
    }),
  );
  expect(api).toHaveBeenCalledWith("/notifications/preferences", {
    method: "PUT",
    body: { push_due_tomorrow: false },
  });
});
test("registration failure leaves preference disabled and exposes a retryable message", async () => {
  const view = render(
    <PushProvider>
      <Probe />
    </PushProvider>,
  );
  await waitFor(() =>
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled(),
  );
  api.mockRejectedValue(new Error("Unable to connect"));
  fireEvent.press(view.getByText("ENABLE"));
  await waitFor(() => expect(view.getByText("Unable to connect")).toBeTruthy());
  expect(api).not.toHaveBeenCalledWith(
    "/notifications/preferences",
    expect.anything(),
  );
});
test("notification tap queues only a task belonging to the current recipient", async () => {
  const view = render(
    <PushProvider>
      <Probe />
    </PushProvider>,
  );
  const listen = (
    Notifications.addNotificationResponseReceivedListener as any
  ).mock.calls.at(-1)[0];
  const response = (userId: number) => ({
    notification: {
      request: {
        content: { data: { type: "TASK_DUE_TOMORROW", taskId: 9, userId } },
      },
    },
  });
  await act(async () => listen(response(2)));
  expect(view.getByText("null")).toBeTruthy();
  await act(async () => listen(response(1)));
  expect(view.getByText('{"taskId":9,"userId":1}')).toBeTruthy();
  expect(refresh).toHaveBeenCalled();
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
});
test("a delayed token from the previous account cannot register or enable a different account", async () => {
  let finish: any;
  (Notifications.getPermissionsAsync as any).mockResolvedValue({
    granted: true,
  });
  (Notifications.getExpoPushTokenAsync as any).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(
    <PushProvider>
      <Probe />
    </PushProvider>,
  );
  await waitFor(() => expect(finish).toBeDefined());
  (useAuth as any).mockReturnValue({ user: { id: 2 }, api });
  view.rerender(
    <PushProvider>
      <Probe />
    </PushProvider>,
  );
  await act(async () => finish({ data: "ExpoPushToken[old]" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/notifications/push-devices",
      expect.objectContaining({
        body: { token: "ExpoPushToken[device]", platform: "android" },
      }),
    ),
  );
  expect(api).not.toHaveBeenCalledWith(
    "/notifications/push-devices",
    expect.objectContaining({
      body: { token: "ExpoPushToken[old]", platform: "android" },
    }),
  );
});
