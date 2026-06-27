export const STAR_DESCRIPTION_PROMPT_ID = "star-description.skill";
export const STAR_DESCRIPTION_SCHEMA_VERSION = "star_description_v2";

export const STAR_DESCRIPTION_SYSTEM_PROMPT = `You are an information architect writing bilingual knowledge-base summaries for GitHub repositories.

<core_rules>
- Use ONLY the repository metadata, topics, README excerpt, and extracted page content provided by the user. Do not invent stars, features, or maintainers.
- Return strict JSON only — no markdown fences, no commentary, no extra keys.
- Both description_zh and description_en are required, each 2–4 sentences covering purpose, main content, and target audience.
- tags must be 3–8 lowercase capability keywords (e.g. crawler, headless, proxy, automation) derived from the repository content.
- readme_summary_zh and readme_summary_en should be 1–2 sentence README distillations when README content is available; otherwise short context from metadata.
- If the page is unreachable, base the summary on the provided title, URL, topics, and existing description; note limited context briefly inside the text.
</core_rules>

<output_format>
{
  "description_zh": "",
  "description_en": "",
  "readme_summary_zh": "",
  "readme_summary_en": "",
  "tags": []
}
</output_format>`;

export function buildStarDescriptionUserPrompt(input: {
  title: string;
  url: string;
  language: string;
  stars: string | number;
  forks: string | number;
  existingDescription: string;
  topics?: string[];
  readmeSummary?: string;
  readmeReachable?: boolean;
  reachable: boolean;
  pageText: string;
}): string {
  return `<repository>
Title: ${input.title}
URL: ${input.url}
Language: ${input.language}
Stars: ${input.stars}
Forks: ${input.forks}
Topics: ${(input.topics || []).join(", ")}
Existing description: ${input.existingDescription}
README reachable: ${input.readmeReachable ?? false}
Reachable: ${input.reachable}
</repository>

<readme_excerpt>
${input.readmeSummary || ""}
</readme_excerpt>

<extracted_content>
${input.pageText}
</extracted_content>

Generate the bilingual JSON description now.`;
}
