"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PixelDiffResult,
  TextDiffResult,
  SpellCheckResult,
  SignatureResult,
} from "@/types";
import { renderPdf, imageDataToDataUrl } from "@/lib/pdf-utils";
import { comparePages } from "@/lib/pixel-compare";
import { compareText } from "@/lib/text-diff";
import PixelDiffViewer from "@/components/PixelDiffViewer";
import TextDiffViewer from "@/components/TextDiffViewer";
import SpellCheckReport from "@/components/SpellCheckReport";
import SignatureStatusComponent from "@/components/SignatureStatus";
import FeedbackForm from "@/components/FeedbackForm";

type Tab = "visual" | "text" | "spelling" | "signature";

export default function ResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("visual");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Chargement des PDFs...");
  const [error, setError] = useState("");

  const [pixelDiff, setPixelDiff] = useState<PixelDiffResult | null>(null);
  const [textDiff, setTextDiff] = useState<TextDiffResult | null>(null);
  const [spellCheck, setSpellCheck] = useState<SpellCheckResult | null>(null);
  const [signatureResult, setSignatureResult] = useState<SignatureResult | null>(null);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [sku, setSku] = useState("");
  const [referenceBlobUrl, setReferenceBlobUrl] = useState("");
  const [newBlobUrl, setNewBlobUrl] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("bat-comparison");
    if (!raw) {
      router.push("/compare");
      return;
    }

    const data = JSON.parse(raw) as {
      sku: string;
      tempBlobUrl: string;
      tempId: string;
      referenceBlobUrl: string;
    };

    setSku(data.sku);
    setReferenceBlobUrl(data.referenceBlobUrl);
    setNewBlobUrl(data.tempBlobUrl);

    const runAnalysis = async () => {
      try {
        // 1. Render both PDFs (from URLs, in the browser)
        setProgress("Rendu du PDF de référence...");
        const refPages = await renderPdf(data.referenceBlobUrl, 1.5, (p, t) =>
          setProgress(`Rendu référence : page ${p}/${t}`)
        );

        setProgress("Rendu du nouveau BAT...");
        const newPages = await renderPdf(data.tempBlobUrl, 1.5, (p, t) =>
          setProgress(`Rendu nouveau BAT : page ${p}/${t}`)
        );

        // 2. Pixel comparison
        setProgress("Comparaison visuelle pixel par pixel...");
        const pixResult = comparePages(refPages, newPages);
        setPixelDiff(pixResult);

        // 3. OCR via Gemini Vision (extraire le texte réel des images)
        setProgress("Extraction du texte par OCR (Gemini)...");
        const refPageImages = refPages.map((p) => ({
          pageNumber: p.pageNumber,
          base64: imageDataToDataUrl(p.imageData).split(",")[1],
        }));
        const newPageImages = newPages.map((p) => ({
          pageNumber: p.pageNumber,
          base64: imageDataToDataUrl(p.imageData).split(",")[1],
        }));

        // OCR les 2 PDFs en parallèle
        const [refOcrRes, newOcrRes] = await Promise.all([
          fetch("/api/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages: refPageImages }),
          }).then((r) => r.ok ? r.json() : { pages: [] }),
          fetch("/api/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages: newPageImages }),
          }).then((r) => r.ok ? r.json() : { pages: [] }),
        ]);

        const refOcrTexts: string[] = refOcrRes.pages?.map((p: { text: string }) => p.text) || [];
        const newOcrTexts: string[] = newOcrRes.pages?.map((p: { text: string }) => p.text) || [];

        // 4. Text comparison (sur le texte OCR)
        setProgress("Comparaison textuelle...");
        const txtResult = compareText(refOcrTexts, newOcrTexts);
        setTextDiff(txtResult);

        // 5. Spell check + Signature (en parallèle)
        setProgress("Vérification orthographique et signature...");
        const allText = newOcrTexts.join("\n\n");

        const spellPromise = fetch("/api/spellcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: allText }),
        })
          .then((r) => (r.ok ? r.json() : { errors: [], totalErrors: 0 }))
          .catch(() => ({ errors: [], totalErrors: 0 }));

        // 6. Signature detection (server-side, in parallel)
        const sigPromise = (async () => {
          const formData = new FormData();
          const lastPage = newPages[newPages.length - 1];
          if (lastPage) {
            const lastPageImage = newPageImages[newPageImages.length - 1];
            formData.append("pages", JSON.stringify([lastPageImage]));
          }
          try {
            const pdfRes = await fetch(data.tempBlobUrl);
            const pdfBlob = await pdfRes.blob();
            formData.append("file", pdfBlob, "new.pdf");
          } catch {
            // continue without digital sig
          }
          const sigRes = await fetch("/api/signature", { method: "POST", body: formData });
          return sigRes.ok ? sigRes.json() : null;
        })().catch(() => null);

        const [spellResult, sigResult] = await Promise.all([spellPromise, sigPromise]);
        setSpellCheck(spellResult);
        if (sigResult) setSignatureResult(sigResult);

        // Overall score
        setOverallScore(pixResult.similarityPercent);
        setLoading(false);
      } catch (err) {
        console.error("Analysis failed:", err);
        setError(`Erreur pendant l'analyse : ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    runAnalysis();
  }, [router]);

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "visual", label: "Diff visuel", badge: pixelDiff ? `${pixelDiff.similarityPercent.toFixed(0)}%` : undefined },
    { id: "text", label: "Diff texte", badge: textDiff ? `${textDiff.totalChanges}` : undefined },
    { id: "spelling", label: "Orthographe", badge: spellCheck ? `${spellCheck.totalErrors}` : undefined },
    { id: "signature", label: "Signature" },
  ];

  const handleValidate = () => {
    sessionStorage.setItem("bat-validation-sku", sku);
    router.push("/validate");
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600">{progress}</p>
        {error && <p className="text-red-600 mt-3">{error}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => router.push("/compare")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">
          Retour
        </button>
      </div>
    );
  }

  const scoreColor =
    overallScore >= 95
      ? "text-green-600 bg-green-50 border-green-200"
      : overallScore >= 80
      ? "text-orange-500 bg-orange-50 border-orange-200"
      : "text-red-600 bg-red-50 border-red-200";

  const canValidate =
    signatureResult?.overallStatus === "signed-digital" ||
    signatureResult?.overallStatus === "signed-handwritten";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Résultats de comparaison
          </h1>
          <p className="text-sm text-slate-500 mt-1">SKU : {sku}</p>
        </div>
        <div className={`px-6 py-3 rounded-xl border ${scoreColor}`}>
          <p className="text-xs uppercase tracking-wide opacity-75">Score global</p>
          <p className="text-2xl font-bold">{overallScore.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-slate-200 text-slate-600">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-8">
        {activeTab === "visual" && pixelDiff && <PixelDiffViewer result={pixelDiff} />}
        {activeTab === "text" && textDiff && <TextDiffViewer result={textDiff} />}
        {activeTab === "spelling" && spellCheck && <SpellCheckReport result={spellCheck} />}
        {activeTab === "signature" && signatureResult && <SignatureStatusComponent result={signatureResult} />}
      </div>

      <FeedbackForm
        sku={sku}
        referenceBlobUrl={referenceBlobUrl}
        newBlobUrl={newBlobUrl}
      />

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.push("/compare")}
          className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Retour
        </button>
        <button
          onClick={handleValidate}
          disabled={!canValidate}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canValidate
            ? "Valider comme nouvelle référence"
            : "Signature requise pour valider"}
        </button>
      </div>
    </div>
  );
}
