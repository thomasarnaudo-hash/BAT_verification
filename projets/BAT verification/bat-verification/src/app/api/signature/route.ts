import { NextRequest, NextResponse } from "next/server";
import { detectDigitalSignature } from "@/lib/signature-detect";
import { detectHandwrittenSignature } from "@/lib/signature-visual";
import { SignatureResult, SignatureStatus } from "@/types";

// POST /api/signature — detect signatures in a PDF
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const pagesJson = formData.get("pages") as string | null; // JSON array of {pageNumber, base64}

  if (!file && !pagesJson) {
    return NextResponse.json(
      { error: "file or pages required" },
      { status: 400 }
    );
  }

  let digitalResult = { found: false, count: 0, details: [] as string[] };
  let handwrittenResult = {
    found: false,
    confidence: 0,
    pages: [] as { pageNumber: number; found: boolean; confidence: number; description: string }[],
  };

  // Digital signature detection (needs PDF file)
  if (file) {
    const buffer = await file.arrayBuffer();
    digitalResult = await detectDigitalSignature(buffer);
  }

  // Handwritten signature detection (needs page images)
  if (pagesJson) {
    const pageImages = JSON.parse(pagesJson) as {
      pageNumber: number;
      base64: string;
    }[];
    handwrittenResult = await detectHandwrittenSignature(pageImages);
  }

  // Determine overall status
  let overallStatus: SignatureStatus = "not-signed";
  if (digitalResult.found) {
    overallStatus = "signed-digital";
  } else if (handwrittenResult.found) {
    overallStatus = "signed-handwritten";
  }

  const result: SignatureResult = {
    digital: digitalResult,
    handwritten: handwrittenResult,
    overallStatus,
  };

  return NextResponse.json(result);
}
