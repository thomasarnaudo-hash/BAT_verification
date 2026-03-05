import { NextRequest, NextResponse } from "next/server";
import {
  getReferences,
  addReference,
  uploadReferencePdf,
} from "@/lib/blob-storage";
import { parseFilename } from "@/lib/metadata";
import { Reference } from "@/types";

// GET /api/references — list all references
export async function GET() {
  try {
    const references = await getReferences();
    return NextResponse.json(references);
  } catch (err) {
    console.error("GET /api/references error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/references — add a new reference
// Accepts JSON body with { sku, productName, blobUrl, filename }
// The PDF is uploaded client-side directly to Vercel Blob via /api/blob-upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, productName, blobUrl, filename } = body;

    if (!sku || !blobUrl) {
      return NextResponse.json(
        { error: "sku and blobUrl are required" },
        { status: 400 }
      );
    }

    // Copy the client-uploaded blob to the canonical path references/<sku>/current.pdf
    const res = await fetch(blobUrl);
    const data = await res.arrayBuffer();
    const finalUrl = await uploadReferencePdf(sku, Buffer.from(data), filename || "current.pdf");

    const parsed = parseFilename(filename || "");

    const ref: Reference = {
      sku,
      productName: productName || parsed?.productName || "Produit sans nom",
      description: parsed?.description || "",
      languages: parsed?.languages || [],
      currentVersion: 1,
      lastValidatedAt: new Date().toISOString(),
      validatedBy: body.validatedBy || "Import initial",
      signatureStatus: "unknown",
      blobUrl: finalUrl,
    };

    await addReference(ref);

    return NextResponse.json(ref, { status: 201 });
  } catch (err) {
    console.error("POST /api/references error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
