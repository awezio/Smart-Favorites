import { NextRequest, NextResponse } from "next/server";
import {
  diffStars,
  fetchAuthenticatedUserStars,
  fetchUserStars,
} from "@/lib/parsers/github-stars";
import { bulkInsertStars, getStars, updateStar, deleteStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret, hasStoredSecret } from "@/lib/server/secrets";

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

    const fetchedStars =
      credentials.useAuthenticatedUser && credentials.token
        ? await fetchAuthenticatedUserStars(credentials.token)
        : await fetchUserStars(credentials.username!, credentials.token);

    // Get existing stars for this user
    const existingStars = await getStars(10000, 0, userId);

    // Perform diff
    const diff = diffStars(existingStars, fetchedStars);

    // Process additions
    const addedWithEmbeddings = await Promise.all(
      diff.added.map(async (star: any) => {
        const textToEmbed = `${star.owner}/${star.repo} ${star.description || ""} ${star.language || ""}`;
        const embedding = await generateEmbedding(textToEmbed);
        return {
          user_id: userId,
          owner: star.owner,
          repo: star.repo,
          url: star.url,
          description: star.description,
          language: star.language,
          stars: star.stars || 0,
          forks: star.forks || 0,
          updated: star.updated,
          embedding,
          updated_at: new Date().toISOString(),
        };
      })
    );

    if (addedWithEmbeddings.length > 0) {
      await bulkInsertStars(addedWithEmbeddings as any);
    }

    // Process modifications
    for (const { old: oldStar, new: newStar } of diff.modified) {
      const textToEmbed = `${newStar.owner}/${newStar.repo} ${newStar.description || ""} ${newStar.language || ""}`;
      const embedding = await generateEmbedding(textToEmbed);

      await updateStar(oldStar.id, {
        owner: newStar.owner,
        repo: newStar.repo,
        url: newStar.url,
        description: newStar.description,
        language: newStar.language,
        stars: newStar.stars,
        forks: newStar.forks,
        updated: newStar.updated,
        embedding,
      });
    }

    // Process removals
    for (const star of diff.removed) {
      await deleteStar(star.id);
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
    .select("github_username, github_token")
    .eq("user_id", userId)
    .maybeSingle();

  const providerToken =
    typeof session?.provider_token === "string" ? session.provider_token : "";
  const storedToken = hasStoredSecret(settings?.github_token)
    ? decryptSecret(settings?.github_token)
    : "";
  const token = requestToken || providerToken || storedToken || process.env.GITHUB_TOKEN || "";
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
