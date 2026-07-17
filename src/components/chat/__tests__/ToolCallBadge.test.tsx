import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

test("ToolCallBadge shows in-progress label for str_replace_editor create", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows done label for str_replace_editor create", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="File created: /App.jsx"
    />
  );

  expect(screen.getByText("Created App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
});

test("ToolCallBadge shows editing label for str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("ToolCallBadge shows edited label for str_replace command when done", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );

  expect(screen.getByText("Edited App.jsx")).toBeDefined();
});

test("ToolCallBadge shows editing label for insert command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/App.jsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("ToolCallBadge shows undo labels for undo_edit command", () => {
  const { rerender } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Undoing changes to App.jsx")).toBeDefined();

  rerender(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Undid changes to App.jsx")).toBeDefined();
});

test("ToolCallBadge shows delete labels for file_manager delete command", () => {
  const { rerender } = render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/old-file.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting old-file.jsx")).toBeDefined();

  rerender(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/old-file.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Deleted old-file.jsx")).toBeDefined();
});

test("ToolCallBadge shows rename labels for file_manager rename command", () => {
  const { rerender } = render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/Old.jsx", new_path: "/New.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming Old.jsx to New.jsx")).toBeDefined();

  rerender(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/Old.jsx", new_path: "/New.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Renamed Old.jsx to New.jsx")).toBeDefined();
});

test("ToolCallBadge shows only the basename for nested paths", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/components/Button.jsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
  expect(screen.queryByText("Creating /components/Button.jsx")).toBeNull();
});

test("ToolCallBadge falls back to the raw tool name for unknown tools", () => {
  render(<ToolCallBadge toolName="some_future_tool" args={{}} state="call" />);

  expect(screen.getByText("some_future_tool")).toBeDefined();
});
