"use client";

import { SignatureResult } from "@/types";

interface SignatureStatusProps {
  result: SignatureResult;
}

export default function SignatureStatus({ result }: SignatureStatusProps) {
  const statusConfig = {
    "signed-digital": {
      label: "Signature numérique détectée",
      color: "bg-green-50 border-green-200 text-green-700",
      icon: "check",
    },
    "signed-handwritten": {
      label: "Signature manuscrite détectée",
      color: "bg-green-50 border-green-200 text-green-700",
      icon: "check",
    },
    "not-signed": {
      label: "Aucune signature détectée",
      color: "bg-red-50 border-red-200 text-red-700",
      icon: "x",
    },
    unknown: {
      label: "Statut inconnu",
      color: "bg-slate-50 border-slate-200 text-slate-600",
      icon: "?",
    },
  };

  const config = statusConfig[result.overallStatus] || statusConfig.unknown;

  return (
    <div>
      {/* Overall status */}
      <div className={`border rounded-xl p-6 mb-6 ${config.color}`}>
        <p className="text-lg font-semibold">{config.label}</p>
      </div>

      {/* Digital signature details */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h3 className="font-semibold text-slate-900 mb-3">
          Signature numérique (PDF)
        </h3>
        {result.digital.found ? (
          <div>
            <p className="text-sm text-green-600 mb-2">
              {result.digital.count} champ{result.digital.count > 1 ? "s" : ""} de
              signature trouvé{result.digital.count > 1 ? "s" : ""}
            </p>
            <ul className="space-y-1">
              {result.digital.details.map((d, i) => (
                <li key={i} className="text-sm text-slate-600">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Aucun champ de signature numérique trouvé dans le PDF.
          </p>
        )}
      </div>

      {/* Handwritten signature details */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">
          Signature manuscrite (IA)
        </h3>
        {result.handwritten.pages.length === 0 ? (
          <p className="text-sm text-slate-500">
            Analyse non effectuée (clé API Gemini requise).
          </p>
        ) : (
          <div className="space-y-3">
            {result.handwritten.pages.map((page) => (
              <div
                key={page.pageNumber}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Page {page.pageNumber}
                  </span>
                  <p className="text-xs text-slate-500">{page.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {page.found ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Signature détectée
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                      Pas de signature
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {(page.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}

            {result.handwritten.found && (
              <p className="text-xs text-slate-400 mt-2 italic">
                La détection par IA peut confondre logos et signatures.
                Confiance globale : {(result.handwritten.confidence * 100).toFixed(0)}%.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
