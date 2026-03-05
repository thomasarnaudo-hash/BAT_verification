import { handleUpload } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

// This route handles client-side upload tokens for Vercel Blob.
// The PDF goes directly from the browser to Blob Storage,
// bypassing the 4.5 MB serverless function payload limit.
export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB max
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do here — metadata is saved separately
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
