import { SpellError } from "@/types";

const LANGUAGETOOL_URL = "https://api.languagetool.org/v2/check";

interface LTMatch {
  message: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  rule: { id: string; description: string };
  context: { text: string; offset: number; length: number };
}

/**
 * Check text for spelling/grammar errors using LanguageTool API.
 * Runs server-side to avoid CORS issues.
 */
export async function checkSpelling(
  text: string,
  language: string
): Promise<SpellError[]> {
  if (!text.trim()) return [];

  // Truncate to 40,000 chars (LanguageTool free limit)
  const truncated = text.slice(0, 40000);

  const params = new URLSearchParams({
    text: truncated,
    language,
    enabledOnly: "false",
  });

  const res = await fetch(LANGUAGETOOL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`LanguageTool API error: ${res.status}`);
  }

  const data = await res.json();
  const matches: LTMatch[] = data.matches || [];

  return matches.map((m) => ({
    message: m.message,
    offset: m.offset,
    length: m.length,
    word: truncated.slice(m.offset, m.offset + m.length),
    suggestions: m.replacements.slice(0, 5).map((r) => r.value),
    rule: m.rule.id,
    language,
    context: m.context.text,
  }));
}
