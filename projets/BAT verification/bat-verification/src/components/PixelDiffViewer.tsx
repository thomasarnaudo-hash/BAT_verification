"use client";

import { useState } from "react";
import { PixelDiffResult } from "@/types";
import PdfViewer from "./PdfViewer";

interface PixelDiffViewerProps {
  result: PixelDiffResult;
}

export default function PixelDiffViewer({ result }: PixelDiffViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const page = result.pages[currentPage];

  if (!page) return null;

  return (
    <div>
      {/* Similarity score */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-slate-600">
          Similarité visuelle :
        </span>
        <span
          className={`text-lg font-bold ${
            result.similarityPercent >= 95
              ? "text-green-600"
              : result.similarityPercent >= 80
              ? "text-orange-500"
              : "text-red-600"
          }`}
        >
          {result.similarityPercent.toFixed(1)}%
        </span>
      </div>

      {/* Page navigation */}
      {result.pages.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-slate-500">
            Page {currentPage + 1} / {result.pages.length}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(result.pages.length - 1, p + 1))
            }
            disabled={currentPage === result.pages.length - 1}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
          >
            Suivant
          </button>

          {/* Per-page similarity */}
          <span
            className={`ml-3 text-sm font-medium ${
              page.similarityPercent >= 95
                ? "text-green-600"
                : page.similarityPercent >= 80
                ? "text-orange-500"
                : "text-red-600"
            }`}
          >
            {page.similarityPercent.toFixed(1)}% identique
          </span>
        </div>
      )}

      {/* Three images side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PdfViewer imageData={page.referenceImage} label="Référence" />
        <PdfViewer imageData={page.newImage} label="Nouveau BAT" />
        <PdfViewer imageData={page.diffImage} label="Différences (rouge)" />
      </div>
    </div>
  );
}
