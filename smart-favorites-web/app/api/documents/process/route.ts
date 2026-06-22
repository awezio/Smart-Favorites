import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { processDocuments } from "@/lib/documents/processor";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const documentId = typeof body.id === "string" ? body.id : undefined;
    const limit = Math.min(
      Math.max(Number(body.limit || 3), 1),
      10
    );

    const processed = await processDocuments({ userId, documentId, limit });
    return NextResponse.json({ processed });
  } catch (error: any) {
    console.error("Document processing API error:", error);
    return NextResponse.json(
      { error: error.message || "Document processing failed" },
      { status: 500 }
    );
  }
}
