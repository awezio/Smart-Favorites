import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth/get-user";
import { deleteDocument, getDocumentById, updateDocument } from "@/lib/db/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const document = await getDocumentById(id, userId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (typeof body.title === "string") {
      updates.title = body.title;
    }

    if (body.metadata && typeof body.metadata === "object") {
      updates.metadata = body.metadata;
    }

    if (typeof body.processing_error === "string") {
      updates.processing_error = body.processing_error;
    }

    const document = await updateDocument(id, userId, updates);
    return NextResponse.json({ document });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const document = await getDocumentById(id, userId);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.storage_path) {
      const { error } = await supabase.storage
        .from("documents")
        .remove([document.storage_path]);

      if (error) {
        throw new Error(error.message);
      }
    }

    await deleteDocument(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
