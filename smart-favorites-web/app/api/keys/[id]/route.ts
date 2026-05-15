import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { updateApiKeyRecord, deleteApiKeyRecord } from "@/lib/tools";

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { userId } = await getAuthUser(request);
    const body = await request.json();
    const updated = await updateApiKeyRecord(userId, context.params.id, body);
    return NextResponse.json({ key: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { userId } = await getAuthUser(request);
    await deleteApiKeyRecord(userId, context.params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
