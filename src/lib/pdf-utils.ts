export interface PdfPage {
  pageNumber: number;
  imageData: ImageData;
  text: string;
  width: number;
  height: number;
}

/**
 * Load a PDF from a URL or ArrayBuffer and render all pages as images + extract text.
 * Uses dynamic import to avoid SSR issues (pdfjs-dist needs DOM APIs).
 * Scale controls the rendering resolution (1 = 72 DPI, 2 = 144 DPI).
 */
export async function renderPdf(
  source: string | ArrayBuffer,
  scale = 2,
  onProgress?: (page: number, total: number) => void
): Promise<PdfPage[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjsLib.getDocument(
    typeof source === "string" ? { url: source } : { data: source }
  );
  const pdf = await loadingTask.promise;
  const pages: PdfPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    pages.push({
      pageNumber: i,
      imageData,
      text,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return pages;
}

/**
 * Convert ImageData to a data URL (for display in <img>)
 */
export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Convert ImageData to a Blob (for sending to API)
 */
export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
