import { NextRequest, NextResponse } from "next/server";
import {
  getReference,
  addReference,
  deleteReference,
  archiveCurrentPdf,
  uploadReferencePdf,
} from "@/lib/blob-storage";
import { SignatureStatus } from "@/types";

// GET /api/references/[sku]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  const { sku } = await params;
  const ref = await getReference(sku);
  if (!ref) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(ref);
}

// PUT /api/references/[sku] — update reference (validate new BAT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  const { sku } = await params;
  const existing = await getReference(sku);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const validatedBy = formData.get("validatedBy") as string;
  const signatureStatus = formData.get("signatureStatus") as string;

  // Archive old version
  await archiveCurrentPdf(sku, existing.currentVersion);

  // Upload new version
  let blobUrl = existing.blobUrl;
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    blobUrl = await uploadReferencePdf(sku, buffer, file.name);
  }

  const updated = {
    ...existing,
    currentVersion: existing.currentVersion + 1,
    lastValidatedAt: new Date().toISOString(),
    validatedBy: validatedBy || existing.validatedBy,
    signatureStatus: (signatureStatus as SignatureStatus) || existing.signatureStatus,
    blobUrl,
  };

  await addReference(updated);

  return NextResponse.json(updated);
}

// DELETE /api/references/[sku]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  const { sku } = await params;
  await deleteReference(sku);
  return NextResponse.json({ ok: true });
}
