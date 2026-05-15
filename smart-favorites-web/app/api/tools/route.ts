import { NextRequest, NextResponse } from "next/server";
import { resolveToolAuth, listApiKeys, resolveApiKey } from "@/lib/tools";
import { listToolDefinitions, getToolDefinition, executeTool } from "@/lib/tools";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveToolAuth(request);
    const tools = listToolDefinitions(context.permissions);
    return NextResponse.json({ tools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveToolAuth(request);
    const body = await request.json();
    const toolName = body.tool;
    const input = body.input || {};

    if (!toolName) {
      return NextResponse.json({ error: "tool is required" }, { status: 400 });
    }

    const def = getToolDefinition(toolName);
    if (!def) {
      return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
    }

    const result = await executeTool(toolName, input, context);

    return NextResponse.json({ output: result.output, metadata: result.metadata });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
