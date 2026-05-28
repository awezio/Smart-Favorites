import { NextRequest, NextResponse } from "next/server";
import { recordApiAuditLog, resolveToolAuth } from "@/lib/tools/auth";
import { listToolDefinitions, getToolDefinition, executeTool } from "@/lib/tools/registry";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveToolAuth(request);
    const tools = listToolDefinitions(context.permissions);
    return NextResponse.json({ tools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  let auditContext: Awaited<ReturnType<typeof resolveToolAuth>> | null = null;
  let auditToolName = "unknown";
  try {
    const context = await resolveToolAuth(request);
    auditContext = context;
    const body = await request.json();
    const toolName = body.tool;
    auditToolName = typeof toolName === "string" ? toolName : "unknown";
    const input = body.input ?? {};

    if (!toolName) {
      return NextResponse.json({ error: "tool is required" }, { status: 400 });
    }

    const def = getToolDefinition(toolName);
    if (!def) {
      return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
    }

    const result = await executeTool(toolName, input, context);
    await recordApiAuditLog({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      toolName,
      action: "execute",
      requestMeta: {
        auth_type: context.authType,
        input_keys: input && typeof input === "object" ? Object.keys(input) : [],
      },
      responseMeta: result.metadata,
      statusCode: 200,
    }).catch((auditError) => {
      console.error("[POST /api/tools] audit failed", auditError);
    });

    return NextResponse.json({ output: result.output, metadata: result.metadata });
  } catch (err: any) {
    if (auditContext) {
      await recordApiAuditLog({
        userId: auditContext.userId,
        apiKeyId: auditContext.apiKeyId,
        toolName: auditToolName,
        action: "execute",
        requestMeta: { auth_type: auditContext.authType },
        responseMeta: { error: err.message },
        statusCode: 500,
      }).catch((auditError) => {
        console.error("[POST /api/tools] audit failed", auditError);
      });
    }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
