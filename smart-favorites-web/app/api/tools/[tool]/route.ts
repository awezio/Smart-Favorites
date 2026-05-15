import { NextRequest, NextResponse } from "next/server";
import { resolveToolAuth } from "@/lib/tools";
import { getToolDefinition, executeTool } from "@/lib/tools";

export async function POST(request: NextRequest, context: { params: { tool: string } }) {
  try {
    const toolName = context.params.tool;
    const def = getToolDefinition(toolName);
    if (!def) {
      return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
    }

    const auth = await resolveToolAuth(request);
    const body = await request.json().catch(() => ({}));

    const result = await executeTool(toolName, body, auth);
    return NextResponse.json({ output: result.output, metadata: result.metadata });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
