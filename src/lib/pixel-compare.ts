import pixelmatch from "pixelmatch";
import { PixelDiffPage, PixelDiffResult } from "@/types";

/**
 * Compare two sets of pages pixel by pixel.
 * Both must have the same number of pages and same dimensions per page.
 */
export function comparePages(
  refPages: { imageData: ImageData; width: number; height: number }[],
  newPages: { imageData: ImageData; width: number; height: number }[]
): PixelDiffResult {
  const pageCount = Math.min(refPages.length, newPages.length);
  const pages: PixelDiffPage[] = [];
  let totalDiffPixels = 0;
  let totalPixels = 0;

  for (let i = 0; i < pageCount; i++) {
    const ref = refPages[i];
    const nw = newPages[i];

    // Use the smaller dimensions if they differ
    const width = Math.min(ref.width, nw.width);
    const height = Math.min(ref.height, nw.height);

    // Crop/resize to same size if needed
    const refData = cropImageData(ref.imageData, ref.width, ref.height, width, height);
    const newData = cropImageData(nw.imageData, nw.width, nw.height, width, height);

    const diffData = new Uint8ClampedArray(width * height * 4);

    const diffPixels = pixelmatch(
      refData.data,
      newData.data,
      diffData,
      width,
      height,
      { threshold: 0.1, alpha: 0.5 }
    );

    const pixCount = width * height;
    totalDiffPixels += diffPixels;
    totalPixels += pixCount;

    pages.push({
      pageNumber: i + 1,
      referenceImage: refData,
      newImage: newData,
      diffImage: new ImageData(diffData, width, height),
      diffPixels,
      totalPixels: pixCount,
      similarityPercent: ((pixCount - diffPixels) / pixCount) * 100,
      width,
      height,
    });
  }

  return {
    pages,
    totalDiffPixels,
    totalPixels,
    similarityPercent:
      totalPixels > 0
        ? ((totalPixels - totalDiffPixels) / totalPixels) * 100
        : 100,
  };
}

function cropImageData(
  source: ImageData,
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): ImageData {
  if (srcWidth === targetWidth && srcHeight === targetHeight) return source;

  const canvas = document.createElement("canvas");
  canvas.width = srcWidth;
  canvas.height = srcHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(source, 0, 0);

  const cropped = ctx.getImageData(0, 0, targetWidth, targetHeight);
  return cropped;
}
