"use client";

import { SpellCheckResult } from "@/types";

interface SpellCheckReportProps {
  result: SpellCheckResult;
}

export default function SpellCheckReport({ result }: SpellCheckReportProps) {
  if (result.totalErrors === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-700 font-medium">
          Aucune faute détectée
        </p>
        <p className="text-green-600 text-sm mt-1">
          Le texte semble correct en orthographe et grammaire.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-slate-600">
          Erreurs détectées :
        </span>
        <span className="text-lg font-bold text-red-600">
          {result.totalErrors} erreur{result.totalErrors !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {result.errors.map((error, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm">
                  {error.word}
                </span>
                <span className="text-xs text-slate-400 ml-2 uppercase">
                  {error.language}
                </span>
              </div>
              <span className="text-xs text-slate-400">{error.rule}</span>
            </div>
            <p className="text-sm text-slate-600 mb-2">{error.message}</p>
            {error.suggestions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Suggestions :</span>
                {error.suggestions.map((s, j) => (
                  <span
                    key={j}
                    className="text-xs font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {error.context && (
              <p className="text-xs text-slate-400 mt-2 italic">
                ...{error.context}...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
