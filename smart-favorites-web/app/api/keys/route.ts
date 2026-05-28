import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createApiKeyRecord, listApiKeys } from "@/lib/tools/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const keys = await listApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name || `Key ${new Date().toISOString()}`;
    const permissions = Array.isArray(body.permissions) ? body.permissions : undefined;
    const expiresAt = body.expires_at || null;

    const created = await createApiKeyRecord(userId, { name, permissions, expiresAt });

    return NextResponse.json({ key: created.key, record: created.record }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
