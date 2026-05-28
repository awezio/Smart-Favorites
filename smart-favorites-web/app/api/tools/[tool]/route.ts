import { NextRequest, NextResponse } from "next/server";
import { recordApiAuditLog, resolveToolAuth } from "@/lib/tools/auth";
import { getToolDefinition, executeTool } from "@/lib/tools/registry";

type RouteContext = { params: Promise<{ tool: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof resolveToolAuth>> | null = null;
  let toolName = "unknown";
  try {
    toolName = (await context.params).tool;
    const def = getToolDefinition(toolName);
    if (!def) {
      return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
    }

    auth = await resolveToolAuth(request);
    const body = await request.json().catch(() => ({}));
    const input = body.input ?? body;

    const result = await executeTool(toolName, input, auth);
    await recordApiAuditLog({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      toolName,
      action: "execute",
      requestMeta: {
        auth_type: auth.authType,
        input_keys: input && typeof input === "object" ? Object.keys(input) : [],
      },
      responseMeta: result.metadata,
      statusCode: 200,
    }).catch((auditError) => {
      console.error("[POST /api/tools/[tool]] audit failed", auditError);
    });
    return NextResponse.json({ output: result.output, metadata: result.metadata });
  } catch (err: any) {
    if (auth) {
      await recordApiAuditLog({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        toolName,
        action: "execute",
        requestMeta: { auth_type: auth.authType },
        responseMeta: { error: err.message },
        statusCode: 500,
      }).catch((auditError) => {
        console.error("[POST /api/tools/[tool]] audit failed", auditError);
      });
    }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
