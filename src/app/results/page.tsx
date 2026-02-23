"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PixelDiffResult,
  TextDiffResult,
  SpellCheckResult,
  SignatureResult,
} from "@/types";
import { comparePages } from "@/lib/pixel-compare";
import { compareText } from "@/lib/text-diff";
import { imageDataToDataUrl } from "@/lib/pdf-utils";
import PixelDiffViewer from "@/components/PixelDiffViewer";
import TextDiffViewer from "@/components/TextDiffViewer";
import SpellCheckReport from "@/components/SpellCheckReport";
import SignatureStatusComponent from "@/components/SignatureStatus";

type Tab = "visual" | "text" | "spelling" | "signature";

interface StoredPageData {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
  imageDataArray: number[];
}

export default function ResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("visual");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Chargement des données...");

  const [pixelDiff, setPixelDiff] = useState<PixelDiffResult | null>(null);
  const [textDiff, setTextDiff] = useState<TextDiffResult | null>(null);
  const [spellCheck, setSpellCheck] = useState<SpellCheckResult | null>(null);
  const [signatureResult, setSignatureResult] = useState<SignatureResult | null>(null);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [sku, setSku] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("bat-comparison");
    if (!raw) {
      router.push("/compare");
      return;
    }

    const data = JSON.parse(raw) as {
      sku: string;
      refPages: StoredPageData[];
      newPages: StoredPageData[];
      tempBlobUrl: string;
      tempId: string;
      referenceBlobUrl: string;
    };

    setSku(data.sku);

    const runAnalysis = async () => {
      // Reconstruct ImageData from stored arrays
      const refPages = data.refPages.map((p) => ({
        imageData: new ImageData(
          new Uint8ClampedArray(p.imageDataArray),
          p.width,
          p.height
        ),
        text: p.text,
        width: p.width,
        height: p.height,
        pageNumber: p.pageNumber,
      }));

      const newPages = data.newPages.map((p) => ({
        imageData: new ImageData(
          new Uint8ClampedArray(p.imageDataArray),
          p.width,
          p.height
        ),
        text: p.text,
        width: p.width,
        height: p.height,
        pageNumber: p.pageNumber,
      }));

      // 1. Pixel comparison (client-side)
      setProgress("Comparaison visuelle pixel par pixel...");
      const pixResult = comparePages(refPages, newPages);
      setPixelDiff(pixResult);

      // 2. Text comparison (client-side)
      setProgress("Comparaison textuelle...");
      const txtResult = compareText(
        refPages.map((p) => p.text),
        newPages.map((p) => p.text)
      );
      setTextDiff(txtResult);

      // 3. Spell check (server-side)
      setProgress("Vérification orthographique...");
      try {
        const allText = newPages.map((p) => p.text).join("\n\n");
        const spellRes = await fetch("/api/spellcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: allText, languages: ["FR", "EN"] }),
        });
        if (spellRes.ok) {
          setSpellCheck(await spellRes.json());
        }
      } catch (err) {
        console.error("Spellcheck failed:", err);
        setSpellCheck({ errors: [], totalErrors: 0 });
      }

      // 4. Signature detection (server-side)
      setProgress("Détection de signature...");
      try {
        const formData = new FormData();

        // Send page images for handwritten detection
        const pageImages = newPages.map((p) => {
          const dataUrl = imageDataToDataUrl(p.imageData);
          const base64 = dataUrl.split(",")[1];
          return { pageNumber: p.pageNumber, base64 };
        });
        formData.append("pages", JSON.stringify(pageImages));

        // Also send the PDF file for digital signature detection
        if (data.tempBlobUrl) {
          try {
            const pdfRes = await fetch(data.tempBlobUrl);
            const pdfBlob = await pdfRes.blob();
            formData.append("file", pdfBlob, "new.pdf");
          } catch {
            // PDF fetch might fail, continue without digital sig check
          }
        }

        const sigRes = await fetch("/api/signature", {
          method: "POST",
          body: formData,
        });
        if (sigRes.ok) {
          setSignatureResult(await sigRes.json());
        }
      } catch (err) {
        console.error("Signature detection failed:", err);
      }

      // Overall score (weighted average)
      const score = pixResult.similarityPercent;
      setOverallScore(score);
      setLoading(false);
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
        <div className="inline-block w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600">{progress}</p>
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

      {/* Tabs */}
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

      {/* Tab content */}
      <div className="mb-8">
        {activeTab === "visual" && pixelDiff && (
          <PixelDiffViewer result={pixelDiff} />
        )}
        {activeTab === "text" && textDiff && (
          <TextDiffViewer result={textDiff} />
        )}
        {activeTab === "spelling" && spellCheck && (
          <SpellCheckReport result={spellCheck} />
        )}
        {activeTab === "signature" && signatureResult && (
          <SignatureStatusComponent result={signatureResult} />
        )}
      </div>

      {/* Validate button */}
      <div className="flex gap-3">
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
