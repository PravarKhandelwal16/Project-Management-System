import React from "react";
import { Text, Button, AppState } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { useAuth } from "../src/context/AuthContext";
import {
  NotificationProvider,
  useNotifications,
} from "../src/context/NotificationContext";
jest.mock("../src/context/AuthContext", () => ({ useAuth: jest.fn() }));
const mockAuth = jest.mocked(useAuth);
function Probe() {
  const n = useNotifications();
  return (
    <>
      <Text>{"Unread:" + n.count}</Text>
      <Button
        title="refresh"
        onPress={() => {
          void n.refresh();
        }}
      />
    </>
  );
}
test("badge reads the shared count, refreshes after read and cancels polling on unmount", async () => {
  const api = jest.fn().mockResolvedValue({ data: { count: 3 } });
  mockAuth.mockReturnValue({ user: { id: 1 }, api } as any);
  const view = render(
    <NotificationProvider>
      <Probe />
    </NotificationProvider>,
  );
  await waitFor(() => expect(view.getByText("Unread:3")).toBeTruthy());
  api.mockResolvedValue({ data: { count: 0 } });
  fireEvent.press(view.getByText("REFRESH"));
  await waitFor(() => expect(view.getByText("Unread:0")).toBeTruthy());
  view.unmount();
});
test("a delayed response from a signed-out account cannot populate another account badge", async () => {
  let finish: any;
  const api = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({ data: { count: 0 } });
  mockAuth.mockReturnValue({ user: { id: 1 }, api } as any);
  const view = render(
    <NotificationProvider>
      <Probe />
    </NotificationProvider>,
  );
  mockAuth.mockReturnValue({ user: { id: 2 }, api } as any);
  view.rerender(
    <NotificationProvider>
      <Probe />
    </NotificationProvider>,
  );
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  await act(async () => {
    finish({ data: { count: 99 } });
  });
  expect(view.getByText("Unread:0")).toBeTruthy();
});
