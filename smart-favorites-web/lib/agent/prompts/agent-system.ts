import type { MemorySnapshot } from "@/lib/agent/memory/memory-store";
import type { SessionSearchHit } from "@/lib/agent/memory/session-search";
import type { WebSearchResult } from "@/lib/search/web-search";
import type { SearchResult } from "@/types";

export const AGENT_SYSTEM_PROMPT = `You are Smart Favorites Agent, a personal knowledge assistant with multi-step retrieval.

<core_rules>
- Use ONLY the evidence blocks provided in the user message: indexed sources [1]-[N] and optional web recommendations [W1]-[Wn].
- Match the user's language (Chinese or English).
- Label evidence tiers in your reasoning:
  - verified: directly from the user's indexed GitHub Stars/bookmarks/documents
  - suggested: from README deep-read excerpts attached to indexed items
  - inferred: from public web search when the personal index had weak matches
- Cite indexed sources with [N]. Cite web recommendations with [Wn] and clearly mark them as "网络推荐 (按热门度排序)" or "Web suggestions (popularity-ranked)" — NOT as saved items.
- When listing GitHub Stars, include owner/repo, URL, language, and why it matches.
- If indexed coverage is partial, mention indexed/total counts briefly.
- Treat injected user profile and agent memory as stable preferences, not as searchable library evidence.
- Be concise. Prefer bullet lists for multi-item answers.
- Do not mention harness, pipelines, or internal tooling.
</core_rules>`;

export function buildAgentSystemPrompt(
  memorySnapshot?: MemorySnapshot,
  options: { memoryNotice?: string } = {}
): string {
  const blocks: string[] = [AGENT_SYSTEM_PROMPT];

  if (memorySnapshot?.profileBlock) {
    blocks.push(`<user_profile frozen_at="${memorySnapshot.frozenAt}">\n${memorySnapshot.profileBlock}\n</user_profile>`);
  }

  if (memorySnapshot?.memoryBlock) {
    blocks.push(`<agent_memory frozen_at="${memorySnapshot.frozenAt}">\n${memorySnapshot.memoryBlock}\n</agent_memory>`);
  }

  if (options.memoryNotice) {
    blocks.push(`<memory_update>\n${options.memoryNotice}\n</memory_update>`);
  }

  return blocks.join("\n\n");
}

const EVIDENCE_MAX_CHARS = 360;
const README_EXCERPT_MAX_CHARS = 480;

function truncate(value: string | null | undefined, maxChars: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

function formatIndexedSource(source: SearchResult, index: number): string {
  if (source.type === "star" && source.star) {
    const readmeExcerpt =
      typeof source.star.description_metadata?.agent_readme_excerpt === "string"
        ? source.star.description_metadata.agent_readme_excerpt
        : "";
    return `${index + 1}. [github_star|verified] ${source.star.owner}/${source.star.repo}
URL: ${source.star.url}
Language: ${source.star.language || ""}
Topics: ${(source.star.topics || []).join(", ")}
Tags: ${(source.star.tags || []).join(", ")}
Description: ${truncate(source.star.description_zh || source.star.description || source.star.description_en, EVIDENCE_MAX_CHARS)}
README summary: ${truncate(source.star.readme_summary_zh || source.star.readme_summary, EVIDENCE_MAX_CHARS)}${readmeExcerpt ? `\nREADME excerpt (suggested): ${truncate(readmeExcerpt, README_EXCERPT_MAX_CHARS)}` : ""}`;
  }

  if (source.type === "bookmark" && source.bookmark) {
    return `${index + 1}. [bookmark|verified] ${source.bookmark.title}
URL: ${source.bookmark.url}
Description: ${truncate(source.bookmark.description_zh || source.bookmark.description || source.bookmark.description_en, EVIDENCE_MAX_CHARS)}`;
  }

  if (source.type === "document" && source.document) {
    return `${index + 1}. [document|verified] ${source.document.title}
Content: ${truncate(source.document.content, EVIDENCE_MAX_CHARS)}`;
  }

  return `${index + 1}. ${source.id}`;
}

function formatWebResults(results: WebSearchResult[]): string {
  if (results.length === 0) return "No web recommendations.";

  return results
    .map(
      (result, index) =>
        `W${index + 1}. [web|inferred] ${result.title}
URL: ${result.url}
Snippet: ${truncate(result.snippet, EVIDENCE_MAX_CHARS)}`
    )
    .join("\n\n");
}

export function buildAgentUserPrompt(input: {
  query: string;
  sources: SearchResult[];
  webResults?: WebSearchResult[];
  indexCoverage?: { total: number; indexed: number };
  pipeline?: string;
  sessionHits?: SessionSearchHit[];
}): string {
  const indexedBlock = input.sources.length
    ? input.sources.slice(0, 12).map(formatIndexedSource).join("\n\n")
    : "No indexed matches.";

  const coverageBlock =
    input.indexCoverage && input.indexCoverage.total > 0
      ? `Indexed coverage: ${input.indexCoverage.indexed}/${input.indexCoverage.total} GitHub Stars have searchable embeddings.\n`
      : "";

  const webBlock = input.webResults?.length
    ? `\nWeb recommendations (NOT in your saved library — popularity-ranked):\n${formatWebResults(input.webResults)}`
    : "";

  const pipelineNote = input.pipeline ? `Pipeline: ${input.pipeline}\n` : "";
  const sessionBlock =
    input.sessionHits && input.sessionHits.length > 0
      ? `\nPast session matches (on-demand search, not memory quota):\n${input.sessionHits
          .map(
            (hit, index) =>
              `${index + 1}. ${hit.title}\nUpdated: ${hit.updatedAt}\nSnippet: ${hit.snippet}`
          )
          .join("\n\n")}\n`
      : "";

  return `Question: ${input.query}

${pipelineNote}${coverageBlock}${sessionBlock}
Indexed evidence (sources [1]-[${Math.min(input.sources.length, 12)}]):
${indexedBlock}${webBlock}

<instructions>
Answer in the user's language.
- Prefer verified indexed stars when they match.
- Use README excerpts only to support indexed items (suggested tier).
- If web results are present, present them separately after indexed matches and label them clearly as web suggestions.
- Never claim web results are already saved in the user's library.
</instructions>`;
}
