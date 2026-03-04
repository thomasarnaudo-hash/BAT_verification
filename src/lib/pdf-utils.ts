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

/**
 * Crée 4 versions rotées d'une image (0°, 90°, 180°, 270°) en base64 JPEG.
 * Utilisé pour l'OCR multi-orientation sur les packagings cosmétiques.
 * Les images sont redimensionnées si nécessaire (max 1500px) pour limiter la taille du payload.
 */
export function createRotatedVersions(imageData: ImageData, quality = 0.5): string[] {
  const { width, height } = imageData;

  // Dessiner l'image source sur un canvas temporaire (une seule fois, réutilisé)
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext("2d")!;
  srcCtx.putImageData(imageData, 0, 0);

  // Redimensionner si trop grand (Gemini n'a pas besoin de plus de 1500px pour l'OCR)
  const MAX_DIM = 1500;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const angles = [0, 90, 180, 270];

  return angles.map((angle) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Pour 90° et 270°, on inverse largeur/hauteur
    if (angle === 90 || angle === 270) {
      canvas.width = sh;
      canvas.height = sw;
    } else {
      canvas.width = sw;
      canvas.height = sh;
    }

    // Appliquer la rotation autour du centre
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(srcCanvas, -sw / 2, -sh / 2, sw, sh);

    return canvas.toDataURL("image/jpeg", quality).split(",")[1];
  });
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
