import { NextRequest, NextResponse } from "next/server";
import { uploadTempPdf } from "@/lib/blob-storage";
import { parseFilename } from "@/lib/metadata";
import { UploadedFile } from "@/types";

// POST /api/upload — upload a temporary PDF for comparison
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const blobUrl = await uploadTempPdf(id, buffer);
  const parsed = parseFilename(file.name);

  const uploaded: UploadedFile = {
    id,
    filename: file.name,
    blobUrl,
    uploadedAt: new Date().toISOString(),
    parsed,
  };

  return NextResponse.json(uploaded, { status: 201 });
}
