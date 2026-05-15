import { listToolDefinitions } from "./registry";

export function getOpenAIFunctions() {
  return listToolDefinitions().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
  }));
}
