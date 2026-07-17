"use client";

import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: any;
  state: string;
  result?: unknown;
}

function basename(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

export function getToolCallLabel(
  toolName: string,
  args: any,
  isDone: boolean
): string {
  const path = args?.path ? basename(args.path) : undefined;
  const newPath = args?.new_path ? basename(args.new_path) : undefined;

  if (toolName === "str_replace_editor" && path) {
    switch (args.command) {
      case "create":
        return isDone ? `Created ${path}` : `Creating ${path}`;
      case "str_replace":
      case "insert":
        return isDone ? `Edited ${path}` : `Editing ${path}`;
      case "undo_edit":
        return isDone ? `Undid changes to ${path}` : `Undoing changes to ${path}`;
      case "view":
        return isDone ? `Viewed ${path}` : `Viewing ${path}`;
    }
  }

  if (toolName === "file_manager" && path) {
    switch (args.command) {
      case "rename":
        return newPath
          ? isDone
            ? `Renamed ${path} to ${newPath}`
            : `Renaming ${path} to ${newPath}`
          : isDone
          ? `Renamed ${path}`
          : `Renaming ${path}`;
      case "delete":
        return isDone ? `Deleted ${path}` : `Deleting ${path}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolName, args, state, result }: ToolCallBadgeProps) {
  const isDone = state === "result" && !!result;
  const label = getToolCallLabel(toolName, args, isDone);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
