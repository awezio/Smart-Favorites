import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient, getAuthUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createAuthenticatedSupabaseClient(user);

    const { data: sessions, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { title } = body;
    const sessionTitle =
      typeof title === "string" && title.trim()
        ? title.trim()
        : "新会话";

    const supabase = await createAuthenticatedSupabaseClient(user);

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .insert({
        title: sessionTitle,
        messages: [],
        user_id: userId,
        title_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ session }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
