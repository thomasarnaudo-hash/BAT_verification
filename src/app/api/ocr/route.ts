import { NextRequest, NextResponse } from "next/server";
import { ocrFromPdfUrl, ocrFromImages } from "@/lib/ocr";

export const maxDuration = 60;

// POST /api/ocr — extract text via Gemini Vision
// Mode 1 (legacy): { pdfUrl: string } — le serveur télécharge le PDF
// Mode 2 (multi-rotation): { images: string[] } — reçoit des images base64 JPEG
export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY non configurée", text: "" },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Mode 2 : images base64 (multi-rotation)
    if (body.images && Array.isArray(body.images) && body.images.length > 0) {
      const text = await ocrFromImages(body.images);
      return NextResponse.json({ text });
    }

    // Mode 1 : pdfUrl (legacy)
    const { pdfUrl } = body as { pdfUrl?: string };
    if (!pdfUrl) {
      return NextResponse.json(
        { error: "pdfUrl or images[] is required", text: "" },
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
