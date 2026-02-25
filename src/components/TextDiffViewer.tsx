"use client";

import { useState } from "react";
import { TextDiffResult } from "@/types";

type ViewMode = "diff" | "reference" | "nouveau";

interface TextDiffViewerProps {
  result: TextDiffResult;
}

export default function TextDiffViewer({ result }: TextDiffViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("diff");
  const page = result.pages[currentPage];

  if (!page) return null;

  const pageChanges = page.changes.filter((c) => c.type !== "unchanged").length;
  const hasText = page.referenceText.trim() || page.newText.trim();

  const viewModes: { id: ViewMode; label: string }[] = [
    { id: "diff", label: "Différences" },
    { id: "reference", label: "Texte référence" },
    { id: "nouveau", label: "Texte nouveau BAT" },
  ];

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-slate-600">
          Modifications textuelles :
        </span>
        <span
          className={`text-lg font-bold ${
            result.totalChanges === 0 ? "text-green-600" : "text-orange-500"
          }`}
        >
          {result.totalChanges} changement{result.totalChanges !== 1 ? "s" : ""}
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
          <span className="ml-3 text-sm text-slate-500">
            {pageChanges} changement{pageChanges !== 1 ? "s" : ""} sur cette page
          </span>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === mode.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {!hasText ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-slate-400 italic">Aucun texte extrait pour cette page.</p>
        </div>
      ) : viewMode === "diff" ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {page.changes.length === 0 ? (
            <p className="text-slate-400 italic">Textes identiques.</p>
          ) : (
            page.changes.map((change, i) => {
              if (change.type === "removed") {
                return (
                  <span
                    key={i}
                    className="bg-red-100 text-red-800 line-through decoration-red-400"
                  >
                    {change.value}
                  </span>
                );
              }
              if (change.type === "added") {
                return (
                  <span key={i} className="bg-green-100 text-green-800">
                    {change.value}
                  </span>
                );
              }
              return <span key={i}>{change.value}</span>;
            })
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
            <div
              className={`w-2 h-2 rounded-full ${
                viewMode === "reference" ? "bg-blue-500" : "bg-purple-500"
              }`}
            />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {viewMode === "reference" ? "Texte de la référence" : "Texte du nouveau BAT"}
            </span>
          </div>
          {viewMode === "reference"
            ? page.referenceText || <span className="text-slate-400 italic">Aucun texte</span>
            : page.newText || <span className="text-slate-400 italic">Aucun texte</span>}
        </div>
      )}
    </div>
  );
}
