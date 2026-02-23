import { NextRequest, NextResponse } from "next/server";
import { checkSpelling } from "@/lib/spellcheck";
import { SpellError } from "@/types";

// POST /api/spellcheck — check text for spelling errors
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, languages } = body as {
    text: string;
    languages: string[];
  };

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const langCodes: Record<string, string> = {
    FR: "fr",
    EN: "en-US",
    DE: "de",
    ES: "es",
    IT: "it",
    NL: "nl",
  };

  const allErrors: SpellError[] = [];

  // Check in each requested language
  const langsToCheck = languages?.length > 0 ? languages : ["FR", "EN"];
  for (const lang of langsToCheck) {
    const code = langCodes[lang.toUpperCase()] || lang.toLowerCase();
    try {
      const errors = await checkSpelling(text, code);
      allErrors.push(...errors);
    } catch (err) {
      console.error(`Spellcheck failed for ${lang}:`, err);
    }
  }

  // Deduplicate by offset+length
  const seen = new Set<string>();
  const unique = allErrors.filter((e) => {
    const key = `${e.offset}:${e.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({
    errors: unique,
    totalErrors: unique.length,
  });
}
