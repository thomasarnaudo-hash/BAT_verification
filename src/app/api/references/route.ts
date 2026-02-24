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

// POST /api/references — add a new reference with its PDF
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sku = formData.get("sku") as string | null;
    const productName = formData.get("productName") as string | null;

    if (!file || !sku) {
      return NextResponse.json(
        { error: "file and sku are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const blobUrl = await uploadReferencePdf(sku, buffer, file.name);

    const parsed = parseFilename(file.name);

    const ref: Reference = {
      sku,
      productName: productName || parsed?.productName || "Produit sans nom",
      description: parsed?.description || "",
      languages: parsed?.languages || [],
      currentVersion: 1,
      lastValidatedAt: new Date().toISOString(),
      validatedBy: (formData.get("validatedBy") as string) || "Import initial",
      signatureStatus: "unknown",
      blobUrl,
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
