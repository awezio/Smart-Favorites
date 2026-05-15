import { listToolDefinitions } from "./registry";

export function getClaudeTools() {
  return listToolDefinitions().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  }));
}
