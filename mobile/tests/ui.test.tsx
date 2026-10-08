import React from "react";
import { test, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { Button, Field, Empty, ErrorBox } from "../src/components/UI";
test("buttons expose actions, disabled state and avoid duplicate presses while busy", () => {
  const press = jest.fn();
  const view = render(<Button title="Save task" onPress={press} busy />);
  const button = view.getByRole("button", { name: "Save task" });
  expect(button.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(button);
  expect(press).not.toHaveBeenCalled();
});
test("forms label inputs and expose validation errors; empty/error states stay usable", () => {
  const view = render(
    <>
      <Field
        label="Task name"
        value=""
        error="A task name is required."
        onChangeText={() => {}}
      />
      <Empty title="No tasks" detail="Change filters." />
      <ErrorBox message="Unable to connect" retry={() => {}} />
    </>,
  );
  expect(view.getByLabelText("Task name")).toBeTruthy();
  expect(view.getByText("A task name is required.")).toBeTruthy();
  expect(view.getByText("No tasks")).toBeTruthy();
  expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
});
