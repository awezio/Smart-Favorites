import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth/get-user";
import { createDocument, getDocuments, updateDocument } from "@/lib/db/documents";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "xlsx",
  "xls",
  "txt",
  "md",
  "html",
  "htm",
]);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const documents = await getDocuments(limit, offset, userId);
    return NextResponse.json({ documents, count: documents.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    await ensureDocumentsBucket(supabase);

    const documentRecord = await createDocument({
      user_id: userId,
      title: formData.get("title")?.toString() || file.name,
      file_name: file.name,
      file_type: file.type || extension,
      file_size: file.size,
      status: "pending",
      metadata: {
        tags: formData.getAll("tags").map((item) => item.toString()),
      },
      storage_path: "",
      processing_error: null,
    });

    const storagePath = `${userId}/${documentRecord.id}/${file.name}`;
    const upload = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const updated = await updateDocument(documentRecord.id, userId, {
      storage_path: storagePath,
    });

    return NextResponse.json({ document: updated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

async function ensureDocumentsBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase.storage.getBucket("documents");
  if (data) {
    return;
  }

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(error.message);
  }

  const created = await supabase.storage.createBucket("documents", {
    public: false,
  });

  if (created.error) {
    throw new Error(created.error.message);
  }
}

