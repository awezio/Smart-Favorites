import { NextRequest, NextResponse } from "next/server";
import { processDocuments } from "@/lib/documents/processor";

const DEFAULT_BATCH_LIMIT = 5;

export async function GET(request: NextRequest) {
  try {
    enforceCronAuth(request);

    const limitParam = request.nextUrl.searchParams.get("limit") || "";
    const limit = Number.isFinite(Number(limitParam)) && Number(limitParam) > 0
      ? Number(limitParam)
      : DEFAULT_BATCH_LIMIT;
    const results = await processDocuments({ limit });
    return NextResponse.json({ processed: results });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cron processing failed" },
      { status: 500 }
    );
  }
}

function enforceCronAuth(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : request.headers.get("x-cron-secret");

  if (!token || token !== secret) {
    throw new Error("Unauthorized cron request");
  }
}
