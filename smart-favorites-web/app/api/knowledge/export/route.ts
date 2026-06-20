import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { exportKnowledgeAsSfkf } from "@/lib/knowledge-format/export";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const payload = await exportKnowledgeAsSfkf(userId);
    return NextResponse.json(payload, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="smart-favorites-sfkf.json"`,
      },
    });
  } catch (error: any) {
    console.error("OKF export API error:", error);
    return NextResponse.json(
      { error: error.message || "Knowledge export failed" },
      { status: 500 }
    );
  }
}

