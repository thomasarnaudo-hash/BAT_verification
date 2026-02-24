"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Reference } from "@/types";
import { renderPdf, PdfPage } from "@/lib/pdf-utils";
import FileUpload from "@/components/FileUpload";
import PdfViewer from "@/components/PdfViewer";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const skuParam = searchParams.get("sku");

  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedSku, setSelectedSku] = useState(skuParam || "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPages, setNewPages] = useState<PdfPage[]>([]);
  const [refPages, setRefPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then(setReferences)
      .catch(console.error);
  }, []);

  const loadReference = useCallback(async (sku: string) => {
    const ref = references.find((r) => r.sku === sku);
    if (!ref) return;
    setProgress("Chargement de la référence...");
    setLoading(true);
    try {
      const pages = await renderPdf(ref.blobUrl, 1.5, (p, t) =>
        setProgress(`Rendu référence : page ${p}/${t}`)
      );
      setRefPages(pages);
    } catch (err) {
      console.error("Failed to load reference:", err);
      setError("Impossible de charger le PDF de référence.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [references]);

  useEffect(() => {
    if (selectedSku && references.length > 0) {
      loadReference(selectedSku);
    }
  }, [selectedSku, references, loadReference]);

  const handleNewFile = async (file: File) => {
    setNewFile(file);
    setLoading(true);
    setProgress("Chargement du nouveau BAT...");
    try {
      const buffer = await file.arrayBuffer();
      const pages = await renderPdf(buffer, 1.5, (p, t) =>
        setProgress(`Rendu nouveau BAT : page ${p}/${t}`)
      );
      setNewPages(pages);
    } catch (err) {
      console.error("Failed to render new PDF:", err);
      setError("Impossible de lire ce PDF.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleCompare = async () => {
    if (!newFile || refPages.length === 0) return;
    setComparing(true);
    setError("");

    try {
      // Upload temp file to get a URL
      const formData = new FormData();
      formData.append("file", newFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'upload.");
        setComparing(false);
        return;
      }
      const uploaded = await uploadRes.json();

      // Store only URLs and SKU in sessionStorage (lightweight!)
      const comparisonData = {
        sku: selectedSku,
        tempBlobUrl: uploaded.blobUrl,
        tempId: uploaded.id,
        referenceBlobUrl: references.find((r) => r.sku === selectedSku)?.blobUrl,
      };

      sessionStorage.setItem("bat-comparison", JSON.stringify(comparisonData));
      router.push("/results");
    } catch (err) {
      console.error("Compare failed:", err);
      setError("Erreur lors du lancement de la comparaison.");
      setComparing(false);
    }
  };

  const selectedRef = references.find((r) => r.sku === selectedSku);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Comparer un BAT
      </h1>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-3">
          1. Sélectionner la référence
        </h2>
        <select
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Choisir une référence --</option>
          {references.map((ref) => (
            <option key={ref.sku} value={ref.sku}>
              {ref.sku} — {ref.productName}
            </option>
          ))}
        </select>

        {selectedRef && refPages.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-2">
              Référence actuelle (v{selectedRef.currentVersion}) :
            </p>
            <PdfViewer
              imageData={refPages[0].imageData}
              label={`Page 1/${refPages.length}`}
              className="max-w-md"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-3">
          2. Uploader le nouveau BAT
        </h2>
        <FileUpload
          onFileSelected={handleNewFile}
          loading={loading && newPages.length === 0}
          accept=".pdf"
          label="Glissez le nouveau BAT ici"
        />

        {newPages.length > 0 && (
          <div className="mt-4">
            <PdfViewer
              imageData={newPages[0].imageData}
              label={`Page 1/${newPages.length}`}
              className="max-w-md"
            />
          </div>
        )}
      </div>

      {progress && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">{progress}</p>
        </div>
      )}

      <button
        onClick={handleCompare}
        disabled={!selectedSku || refPages.length === 0 || newPages.length === 0 || comparing}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {comparing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Upload en cours...
          </span>
        ) : (
          "Lancer la comparaison"
        )}
      </button>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Chargement...</div>}>
      <CompareContent />
    </Suspense>
  );
}
