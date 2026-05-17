import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import assert from "node:assert/strict";

const root = cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

const toolRoute = read("app/api/tools/route.ts");
const dynamicToolRoute = read("app/api/tools/[tool]/route.ts");

assert.match(
  toolRoute,
  /recordApiAuditLog/,
  "POST /api/tools must write audit logs for third-party calls"
);

assert.match(
  dynamicToolRoute,
  /body\.input/,
  "POST /api/tools/[tool] must accept the documented { input } wrapper"
);

assert.match(
  dynamicToolRoute,
  /recordApiAuditLog/,
  "POST /api/tools/[tool] must write audit logs"
);

assert.ok(
  existsSync(join(root, "..", "docs", "API_REFERENCE.md")),
  "Phase 4 must include API reference documentation"
);

const toolsDocPath = join(root, "..", "docs", "TOOLS_INTEGRATION.md");
assert.ok(
  existsSync(toolsDocPath),
  "Phase 4 must include tools integration documentation"
);

const toolsDoc = readFileSync(toolsDocPath, "utf8");
for (const phrase of ["OpenAI", "Claude", "DeepSeek", "Authorization: Bearer"]) {
  assert.match(toolsDoc, new RegExp(phrase), `Integration docs must mention ${phrase}`);
}
