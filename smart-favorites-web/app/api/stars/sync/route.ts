import { NextRequest, NextResponse, after } from "next/server";
import { backfillStarEmbeddings } from "@/lib/jobs/backfill-star-embeddings";
import {
  diffStars,
  fetchAuthenticatedUserStars,
  fetchUserStars,
} from "@/lib/parsers/github-stars";
import { bulkInsertStars, bulkUpsertStars, bulkDeleteStars, getStarsForSync } from "@/lib/db/github-stars";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type GitHubSyncCredentials = {
  username?: string;
  token?: string;
  useAuthenticatedUser: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { username, token } = body;

    if (username !== undefined && typeof username !== "string") {
      return NextResponse.json(
        { error: "GitHub username must be a string" },
        { status: 400 }
      );
    }

    if (token !== undefined && typeof token !== "string") {
      return NextResponse.json(
        { error: "GitHub token must be a string" },
        { status: 400 }
      );
    }

    const credentials = await resolveGitHubSyncCredentials({
      requestUsername: username?.trim() || "",
      requestToken: token?.trim() || "",
      userId,
      user,
    });

    if (!credentials.useAuthenticatedUser && !credentials.username) {
      return NextResponse.json(
        {
          error:
            "GitHub login or username is required. Sign in with GitHub, or enter a username.",
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const fetchedStars =
      credentials.useAuthenticatedUser && credentials.token
        ? await fetchAuthenticatedUserStars(credentials.token)
        : await fetchUserStars(credentials.username!, credentials.token);

    // Get existing stars for this user
    const existingStars = await getStarsForSync(userId, supabase);

    // Perform diff
    const diff = diffStars(existingStars, fetchedStars);

    // Process additions
    const addedStars = diff.added.map((star: any) => ({
      user_id: userId,
      owner: star.owner,
      repo: star.repo,
      url: star.url,
      description: star.description,
      language: star.language,
      stars: star.stars || 0,
      forks: star.forks || 0,
      updated: star.updated,
      topics: star.topics || [],
      starred_at: star.starred_at || null,
      index_status: "pending",
      updated_at: new Date().toISOString(),
    }));

    if (addedStars.length > 0) {
      await bulkInsertStars(addedStars as any, supabase);
    }

    if (diff.modified.length > 0) {
      const modifiedStars = diff.modified.map(({ old: oldStar, new: newStar }) => ({
        id: oldStar.id,
        user_id: userId,
        owner: newStar.owner,
        repo: newStar.repo,
        url: newStar.url,
        description: newStar.description,
        language: newStar.language,
        stars: newStar.stars,
        forks: newStar.forks,
        updated: newStar.updated,
        topics: newStar.topics || [],
        starred_at: newStar.starred_at || oldStar.starred_at || null,
        index_status: oldStar.index_status === "indexed" ? oldStar.index_status : "pending",
        updated_at: new Date().toISOString(),
      }));
      await bulkUpsertStars(modifiedStars as any, supabase);
    }

    if (diff.removed.length > 0) {
      await bulkDeleteStars(
        diff.removed.map((star) => star.id),
        userId,
        supabase
      );
    }

    const urlsToBackfill = [
      ...diff.added.map((star) => star.url),
      ...diff.modified.map(({ new: star }) => star.url),
    ];

    if (urlsToBackfill.length > 0 || diff.unchanged_count > 0) {
      after(async () => {
        try {
          if (urlsToBackfill.length > 0) {
            await backfillStarEmbeddings(userId, urlsToBackfill);
          }
          await backfillStarEmbeddings(userId);
        } catch (error) {
          console.error("Stars embedding backfill error:", error);
        }
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        added: diff.added.length,
        modified: diff.modified.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged_count,
      },
    });
  } catch (error: any) {
    console.error("Stars sync error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}

async function resolveGitHubSyncCredentials({
  requestUsername,
  requestToken,
  userId,
  user,
}: {
  requestUsername: string;
  requestToken: string;
  userId: string;
  user: any;
}): Promise<GitHubSyncCredentials> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("github_username")
    .eq("user_id", userId)
    .maybeSingle();

  const providerToken = sanitizeGitHubToken(session?.provider_token);
  const explicitToken = sanitizeGitHubToken(requestToken);
  const token = explicitToken || providerToken;
  const metadata = user && "user_metadata" in user ? user.user_metadata || {} : {};
  const metadataUsername =
    metadata.user_name ||
    metadata.preferred_username ||
    metadata.nickname ||
    metadata.login ||
    "";
  const username = requestUsername || settings?.github_username || metadataUsername || "";

  return {
    username,
    token,
    useAuthenticatedUser: !requestUsername && Boolean(providerToken),
  };
}

function sanitizeGitHubToken(value: unknown): string {
  if (typeof value !== "string") return "";
  const token = value.trim().replace(/^Bearer\s+/i, "");
  return isUsableGitHubToken(token) ? token : "";
}

function isUsableGitHubToken(token: string): boolean {
  if (!token) return false;

  const lowered = token.toLowerCase();
  if (
    lowered === "undefined" ||
    lowered === "null" ||
    lowered.includes("your_token") ||
    lowered.includes("github_token")
  ) {
    return false;
  }

  return /^(github_pat_|gh[opusr]_)[A-Za-z0-9_]+$/.test(token);
}
