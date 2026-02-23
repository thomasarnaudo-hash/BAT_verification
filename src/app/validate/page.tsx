"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Reference } from "@/types";

export default function ValidatePage() {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [reference, setReference] = useState<Reference | null>(null);
  const [validatedBy, setValidatedBy] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const storedSku = sessionStorage.getItem("bat-validation-sku");
    if (!storedSku) {
      router.push("/");
      return;
    }
    setSku(storedSku);

    fetch(`/api/references/${encodeURIComponent(storedSku)}`)
      .then((r) => r.json())
      .then(setReference)
      .catch(console.error);
  }, [router]);

  const handleSubmit = async () => {
    if (!confirmed || !validatedBy.trim()) return;
    setSubmitting(true);

    try {
      // Get the temp file from comparison data
      const comparisonRaw = sessionStorage.getItem("bat-comparison");
      if (!comparisonRaw) {
        alert("Données de comparaison manquantes. Refaites la comparaison.");
        router.push("/compare");
        return;
      }

      const comparison = JSON.parse(comparisonRaw);
      const tempBlobUrl = comparison.tempBlobUrl;

      // Download temp file and re-upload as new reference
      const pdfRes = await fetch(tempBlobUrl);
      const pdfBlob = await pdfRes.blob();

      const formData = new FormData();
      formData.append("file", pdfBlob, "new.pdf");
      formData.append("validatedBy", validatedBy);
      formData.append("signatureStatus", "signed-handwritten");

      const res = await fetch(`/api/references/${encodeURIComponent(sku)}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
        // Clean up
        sessionStorage.removeItem("bat-comparison");
        sessionStorage.removeItem("bat-validation-sku");
      } else {
        alert("Erreur lors de la validation.");
      }
    } catch (err) {
      console.error("Validation failed:", err);
      alert("Erreur lors de la validation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Référence mise à jour
        </h2>
        <p className="text-slate-500 mb-6">
          Le BAT pour {sku} a été validé par {validatedBy} et enregistré comme
          nouvelle référence (v{(reference?.currentVersion || 0) + 1}).
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
        >
          Retour au dashboard
        </button>
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Valider le nouveau BAT
      </h1>

      {/* Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Résumé</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">SKU</dt>
            <dd className="font-mono text-slate-900">{sku}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Produit</dt>
            <dd className="text-slate-900">{reference.productName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Version actuelle</dt>
            <dd className="text-slate-900">v{reference.currentVersion}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Nouvelle version</dt>
            <dd className="text-slate-900 font-semibold">
              v{reference.currentVersion + 1}
            </dd>
          </div>
        </dl>
      </div>

      {/* Validated by */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <label
          htmlFor="validatedBy"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Validé par
        </label>
        <input
          id="validatedBy"
          type="text"
          value={validatedBy}
          onChange={(e) => setValidatedBy(e.target.value)}
          placeholder="Prénom Nom"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Confirmation */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">
            Je confirme que ce BAT a été vérifié, que les différences sont
            acceptées, et qu&apos;il peut remplacer la référence actuelle.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!confirmed || !validatedBy.trim() || submitting}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Validation en cours..." : "Confirmer la validation"}
        </button>
      </div>
    </div>
  );
}
