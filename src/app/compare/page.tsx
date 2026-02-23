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

  // Fetch references list
  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then(setReferences)
      .catch(console.error);
  }, []);

  // Load reference PDF when SKU is selected
  const loadReference = useCallback(async (sku: string) => {
    const ref = references.find((r) => r.sku === sku);
    if (!ref) return;
    setProgress("Chargement de la référence...");
    setLoading(true);
    try {
      const pages = await renderPdf(ref.blobUrl, 2, (p, t) =>
        setProgress(`Rendu référence : page ${p}/${t}`)
      );
      setRefPages(pages);
    } catch (err) {
      console.error("Failed to load reference:", err);
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

  // Handle new file upload
  const handleNewFile = async (file: File) => {
    setNewFile(file);
    setLoading(true);
    setProgress("Chargement du nouveau BAT...");
    try {
      const buffer = await file.arrayBuffer();
      const pages = await renderPdf(buffer, 2, (p, t) =>
        setProgress(`Rendu nouveau BAT : page ${p}/${t}`)
      );
      setNewPages(pages);
    } catch (err) {
      console.error("Failed to render new PDF:", err);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // Launch comparison
  const handleCompare = async () => {
    if (!newFile || refPages.length === 0) return;
    setComparing(true);

    // Upload temp file
    const formData = new FormData();
    formData.append("file", newFile);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploaded = await uploadRes.json();

    // Store comparison data in sessionStorage for the results page
    const comparisonData = {
      sku: selectedSku,
      refPages: refPages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        width: p.width,
        height: p.height,
        imageDataArray: Array.from(p.imageData.data),
      })),
      newPages: newPages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        width: p.width,
        height: p.height,
        imageDataArray: Array.from(p.imageData.data),
      })),
      tempBlobUrl: uploaded.blobUrl,
      tempId: uploaded.id,
      referenceBlobUrl: references.find((r) => r.sku === selectedSku)?.blobUrl,
    };

    sessionStorage.setItem("bat-comparison", JSON.stringify(comparisonData));
    router.push("/results");
  };

  const selectedRef = references.find((r) => r.sku === selectedSku);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Comparer un BAT
      </h1>

      {/* Step 1: Select reference */}
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

      {/* Step 2: Upload new BAT */}
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

      {/* Progress */}
      {progress && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">{progress}</p>
        </div>
      )}

      {/* Step 3: Launch comparison */}
      <button
        onClick={handleCompare}
        disabled={
          !selectedSku || refPages.length === 0 || newPages.length === 0 || comparing
        }
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {comparing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Comparaison en cours...
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
