import { NextRequest, NextResponse } from "next/server";
import { ocrPageImage } from "@/lib/ocr";

// POST /api/ocr — extract text from page images via Gemini Vision
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pages } = body as {
    pages: { pageNumber: number; base64: string }[];
  };

  if (!pages || pages.length === 0) {
    return NextResponse.json(
      { error: "pages array is required" },
      { status: 400 }
    );
  }

  const results: { pageNumber: number; text: string }[] = [];

  for (const page of pages) {
    try {
      const text = await ocrPageImage(page.base64);
      results.push({ pageNumber: page.pageNumber, text });
    } catch (err) {
      console.error(`OCR failed for page ${page.pageNumber}:`, err);
      results.push({ pageNumber: page.pageNumber, text: "" });
    }
  }

  return NextResponse.json({ pages: results });
}
