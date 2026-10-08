import React from "react";
import { Button, Text } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { jest, test, expect, beforeEach } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { rememberPushToken } from "../src/services/push";
import { SESSION_EXPIRED } from "../src/services/apiCore";
const user = {
  id: 1,
  full_name: "Team member",
  email: "member@example.test",
  role: "member",
  permissions: ["projects.view"],
};
const response = (status: number, body: any) =>
  ({ status, ok: status < 400, json: async () => body }) as Response;
function Probe() {
  const a = useAuth();
  return (
    <>
      <Text>
        {a.initializing
          ? "restoring"
          : a.user
            ? "signed-in:" + a.user.full_name
            : "signed-out"}
      </Text>
      <Text>{a.notice}</Text>
      <Text>{a.startupError}</Text>
      <Button
        title="login"
        onPress={() => {
          void a.login(user.email, "Testing123!");
        }}
      />
      <Button
        title="logout"
        onPress={() => {
          void a.logout();
        }}
      />
      <Button
        title="refresh"
        onPress={() => {
          void a.refreshUser().catch(() => {});
        }}
      />
      <Button title="retry" onPress={a.retry} />
    </>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue();
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue();
});
test("login verifies /me and persists only JWT in SecureStore; logout clears offline", async () => {
  global.fetch = jest
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      String(url).endsWith("/auth/login")
        ? response(200, { token: "jwt" })
        : response(200, { user }),
    );
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(view.getByText("signed-out")).toBeTruthy());
  fireEvent.press(view.getByText("LOGIN"));
  await waitFor(() =>
    expect(view.getByText("signed-in:Team member")).toBeTruthy(),
  );
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    "projectmaster.session.v1",
    "jwt",
    { keychainAccessible: "device" },
  );
  jest.mocked(global.fetch).mockRejectedValue(new TypeError("offline"));
  fireEvent.press(view.getByText("LOGOUT"));
  await waitFor(() => expect(view.getByText("signed-out")).toBeTruthy());
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
test("restores encrypted token and verifies current server permissions", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("persisted");
  global.fetch = jest
    .fn<typeof fetch>()
    .mockResolvedValue(response(200, { user }));
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(view.getByText("signed-in:Team member")).toBeTruthy(),
  );
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/auth/me"),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer persisted" }),
    }),
  );
});
test("expired token clears storage and displays the requested session message", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("expired");
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(401, {}));
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(view.getByText(SESSION_EXPIRED)).toBeTruthy());
  expect(view.getByText("signed-out")).toBeTruthy();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
test("offline startup preserves token and waits for a successful retry before unlocking", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("persisted");
  global.fetch = jest
    .fn<typeof fetch>()
    .mockRejectedValue(new TypeError("offline"));
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(view.getByText(/Unable to connect/)).toBeTruthy());
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  jest.mocked(global.fetch).mockResolvedValue(response(200, { user }));
  fireEvent.press(view.getByText("RETRY"));
  await waitFor(() =>
    expect(view.getByText("signed-in:Team member")).toBeTruthy(),
  );
});

test("online logout removes the registered push device using the current JWT", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("persisted");
  global.fetch = jest
    .fn<typeof fetch>()
    .mockResolvedValue(response(200, { user }));
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(view.getByText("signed-in:Team member")).toBeTruthy(),
  );
  await rememberPushToken("ExpoPushToken[device]");
  fireEvent.press(view.getByText("LOGOUT"));
  await waitFor(() => expect(view.getByText("signed-out")).toBeTruthy());
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/notifications/push-devices"),
    expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ token: "ExpoPushToken[device]" }),
      headers: expect.objectContaining({ Authorization: "Bearer persisted" }),
    }),
  );
});
