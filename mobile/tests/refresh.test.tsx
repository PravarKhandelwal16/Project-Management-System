import React from "react";
import { Text, Button } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { usePaged } from "../src/hooks/useData";
import { useAuth } from "../src/context/AuthContext";
jest.mock("../src/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: any) =>
    require("react").useEffect(callback, [callback]),
}));
const mockAuth = jest.mocked(useAuth);
function Probe({ search = "" }: { search?: string }) {
  const list = usePaged("/tasks", { search });
  return (
    <>
      <Text>{list.rows.map((row) => row.name).join(",")}</Text>
      <Text>{list.error}</Text>
      <Button
        title="more"
        onPress={() => {
          void list.more();
        }}
      />
      <Button
        title="refresh"
        onPress={() => {
          void list.refresh();
        }}
      />
    </>
  );
}
test("pagination loads bounded server pages, deduplicates and refreshes authoritative changes", async () => {
  const api = jest
    .fn()
    .mockResolvedValueOnce({
      data: [{ id: 1, name: "Web task" }],
      pagination: { has_more: true },
    })
    .mockResolvedValueOnce({
      data: [
        { id: 1, name: "Web task" },
        { id: 2, name: "Second task" },
      ],
      pagination: { has_more: false },
    })
    .mockResolvedValue({
      data: [{ id: 1, name: "Updated on web" }],
      pagination: { has_more: false },
    });
  mockAuth.mockReturnValue({ api } as any);
  const view = render(<Probe />);
  await waitFor(() => expect(view.getByText("Web task")).toBeTruthy());
  fireEvent.press(view.getByText("MORE"));
  await waitFor(() =>
    expect(view.getByText("Web task,Second task")).toBeTruthy(),
  );
  expect(api.mock.calls[1][0]).toContain("page=2");
  expect(api.mock.calls[1][0]).toContain("limit=20");
  fireEvent.press(view.getByText("REFRESH"));
  await waitFor(() => expect(view.getByText("Updated on web")).toBeTruthy());
});
test("a stale search response cannot overwrite a newer filter result", async () => {
  let finish: any;
  const api = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({
      data: [{ id: 2, name: "New result" }],
      pagination: { has_more: false },
    });
  mockAuth.mockReturnValue({ api } as any);
  const view = render(<Probe search="old" />);
  view.rerender(<Probe search="new" />);
  await waitFor(() => expect(view.getByText("New result")).toBeTruthy());
  await act(async () => {
    finish({
      data: [{ id: 1, name: "Stale result" }],
      pagination: { has_more: false },
    });
  });
  expect(view.queryByText("Stale result")).toBeNull();
});
