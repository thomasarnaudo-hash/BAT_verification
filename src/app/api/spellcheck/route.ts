import { NextRequest, NextResponse } from "next/server";
import { checkSpelling } from "@/lib/spellcheck";

// POST /api/spellcheck — check text for spelling errors
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    // Un seul appel avec language=auto : LanguageTool détecte la langue automatiquement
    // Cela évite les faux positifs (mots anglais signalés comme erreurs FR et vice-versa)
    const errors = await checkSpelling(text, "auto");

    return NextResponse.json({
      errors,
      totalErrors: errors.length,
    });
  } catch (err) {
    console.error("Spellcheck failed:", err);
    return NextResponse.json({ errors: [], totalErrors: 0 });
  }
}
