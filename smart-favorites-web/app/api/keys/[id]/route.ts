import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { updateApiKeyRecord, deleteApiKeyRecord } from "@/lib/tools/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId } = await getAuthUser(request);
    const body = await request.json();
    const updated = await updateApiKeyRecord(userId, id, body);
    return NextResponse.json({ key: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId } = await getAuthUser(request);
    await deleteApiKeyRecord(userId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
