import { NextRequest, NextResponse } from "next/server";
import { ocrPageImage } from "@/lib/ocr";

export const maxDuration = 30;

// POST /api/ocr — extract text from page images via Gemini Vision
export async function POST(request: NextRequest) {
  try {
    // Vérifier que la clé API est configurée
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Debug : lister les env vars qui commencent par GEMINI (sans révéler les valeurs)
      const geminiVars = Object.keys(process.env).filter(k => k.includes("GEMINI"));
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY non configurée sur le serveur",
          debug: {
            geminiVarsFound: geminiVars,
            allEnvKeysCount: Object.keys(process.env).length,
            hasVercelEnv: !!process.env.VERCEL,
            nodeEnv: process.env.NODE_ENV,
          },
          pages: [],
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { pages } = body as {
      pages: { pageNumber: number; base64: string }[];
    };

    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: "pages array is required", pages: [] },
        { status: 400 }
      );
    }

    const results: { pageNumber: number; text: string; error?: string }[] = [];

    for (const page of pages) {
      try {
        const text = await ocrPageImage(page.base64);
        results.push({ pageNumber: page.pageNumber, text });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`OCR failed for page ${page.pageNumber}:`, errorMsg);
        results.push({
          pageNumber: page.pageNumber,
          text: "",
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({ pages: results });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("OCR route error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg, pages: [] },
      { status: 500 }
    );
  }
}
