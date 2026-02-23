"use client";

import Link from "next/link";
import { Reference } from "@/types";

function SignatureBadge({ status }: { status: Reference["signatureStatus"] }) {
  const config = {
    "signed-digital": { label: "Signé (digital)", color: "bg-green-100 text-green-700" },
    "signed-handwritten": { label: "Signé (manuscrit)", color: "bg-green-100 text-green-700" },
    "not-signed": { label: "Non signé", color: "bg-red-100 text-red-700" },
    unknown: { label: "Inconnu", color: "bg-slate-100 text-slate-600" },
  };
  const { label, color } = config[status] || config.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function LanguageBadge({ lang }: { lang: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
      {lang}
    </span>
  );
}

export default function ReferenceCard({
  reference,
  onDelete,
}: {
  reference: Reference;
  onDelete?: (sku: string) => void;
}) {
  const date = new Date(reference.lastValidatedAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-mono text-slate-400 mb-1">{reference.sku}</p>
          <h3 className="font-semibold text-slate-900">{reference.productName}</h3>
          {reference.description && (
            <p className="text-sm text-slate-500 mt-0.5">{reference.description}</p>
          )}
        </div>
        <SignatureBadge status={reference.signatureStatus} />
      </div>

      <div className="flex items-center gap-2 mb-4">
        {reference.languages.map((lang) => (
          <LanguageBadge key={lang} lang={lang} />
        ))}
        <span className="text-xs text-slate-400">v{reference.currentVersion}</span>
        <span className="text-xs text-slate-400">{date}</span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/compare?sku=${encodeURIComponent(reference.sku)}`}
          className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Comparer
        </Link>
        <a
          href={reference.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Voir PDF
        </a>
        {onDelete && (
          <button
            onClick={() => onDelete(reference.sku)}
            className="px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
