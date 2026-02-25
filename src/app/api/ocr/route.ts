import { NextRequest, NextResponse } from "next/server";
import { ocrFromPdfUrl } from "@/lib/ocr";

export const maxDuration = 60;

// POST /api/ocr — extract text from a PDF via Gemini Vision
// Body: { pdfUrl: string }
// Le serveur télécharge le PDF et l'envoie directement à Gemini (pas de transit par le navigateur)
export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY non configurée", text: "" },
        { status: 500 }
      );
    }

    const { pdfUrl } = (await request.json()) as { pdfUrl: string };

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "pdfUrl is required", text: "" },
        { status: 400 }
      );
    }

    const text = await ocrFromPdfUrl(pdfUrl);
    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OCR error:", msg);
    return NextResponse.json({ error: msg, text: "" }, { status: 500 });
  }
}
