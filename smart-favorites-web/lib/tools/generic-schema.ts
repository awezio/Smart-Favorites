import type { ToolDefinition } from "@/types";

export function toGenericToolSchema(tool: ToolDefinition) {
  return {
    name: tool.name,
    description: tool.description,
    category: tool.category,
    permissions: tool.permissions,
    input_schema: tool.input_schema,
    output_schema: tool.output_schema,
  };
}
