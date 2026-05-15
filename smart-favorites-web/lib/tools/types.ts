import type {
  ToolCategory,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolPermission,
} from "@/types";

export type {
  ToolCategory,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolPermission,
};

export type ToolExecutor = (
  input: unknown,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

export type ToolRegistration = ToolDefinition & {
  execute: ToolExecutor;
};
