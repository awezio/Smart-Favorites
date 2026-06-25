export const STAR_DESCRIPTION_PROMPT_ID = "star-description.skill";
export const STAR_DESCRIPTION_SCHEMA_VERSION = "star_description_v1";

export const STAR_DESCRIPTION_SYSTEM_PROMPT = `You are an information architect writing bilingual knowledge-base summaries for GitHub repositories.

<core_rules>
- Use ONLY the repository metadata and extracted page content provided by the user. Do not invent stars, features, or maintainers.
- Return strict JSON only — no markdown fences, no commentary, no extra keys.
- Both description_zh and description_en are required, each 2–4 sentences covering purpose, main content, and target audience.
- If the page is unreachable, base the summary on the provided title, URL, and existing description; note limited context briefly inside the text.
</core_rules>

<output_format>
{
  "description_zh": "",
  "description_en": ""
}
</output_format>`;

export function buildStarDescriptionUserPrompt(input: {
  title: string;
  url: string;
  language: string;
  stars: string | number;
  forks: string | number;
  existingDescription: string;
  reachable: boolean;
  pageText: string;
}): string {
  return `<repository>
Title: ${input.title}
URL: ${input.url}
Language: ${input.language}
Stars: ${input.stars}
Forks: ${input.forks}
Existing description: ${input.existingDescription}
Reachable: ${input.reachable}
</repository>

<extracted_content>
${input.pageText}
</extracted_content>

Generate the bilingual JSON description now.`;
}
