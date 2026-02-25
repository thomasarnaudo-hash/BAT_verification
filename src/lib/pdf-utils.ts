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
    const rawText = textContent.items
      .map((item) => {
        if (!("str" in item)) return "";
        return item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ");
      })
      .join("");
    const text = cleanText(rawText);

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
/**
 * Nettoie le texte extrait d'un PDF :
 * - Remplace les espaces multiples par un espace simple
 * - Supprime les espaces en début/fin de ligne
 * - Supprime les lignes vides en excès
 */
export function cleanText(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Convertit ImageData en base64 JPEG compressé (pour envoi à l'API OCR).
 * Réduit la taille ~10x par rapport au PNG base64.
 */
export function imageDataToJpegBase64(imageData: ImageData, quality = 0.8): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
}

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
