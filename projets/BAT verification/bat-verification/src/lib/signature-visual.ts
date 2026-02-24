import { GoogleGenerativeAI } from "@google/generative-ai";
import { HandwrittenSignatureResult, HandwrittenSignaturePage } from "@/types";

/**
 * Detect handwritten signatures in PDF page images using Gemini vision.
 * Runs server-side to protect the API key.
 */
export async function detectHandwrittenSignature(
  pageImages: { pageNumber: number; base64: string }[]
): Promise<HandwrittenSignatureResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      found: false,
      confidence: 0,
      pages: pageImages.map((p) => ({
        pageNumber: p.pageNumber,
        found: false,
        confidence: 0,
        description: "Clé API Gemini non configurée",
      })),
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const pages: HandwrittenSignaturePage[] = [];

  for (const pageImg of pageImages) {
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "image/png",
            data: pageImg.base64,
          },
        },
        `Analyse cette image d'une page de BAT (Bon à Tirer) de packaging.
Y a-t-il une signature manuscrite visible sur cette page ?
Réponds en JSON strict avec ce format :
{"found": true/false, "confidence": 0.0-1.0, "description": "description courte"}
Ne réponds que le JSON, rien d'autre.`,
      ]);

      const text = result.response.text().trim();
      // Extract JSON from response (it might be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        pages.push({
          pageNumber: pageImg.pageNumber,
          found: Boolean(parsed.found),
          confidence: Number(parsed.confidence) || 0,
          description: String(parsed.description || ""),
        });
      } else {
        pages.push({
          pageNumber: pageImg.pageNumber,
          found: false,
          confidence: 0,
          description: "Réponse non interprétable",
        });
      }
    } catch (err) {
      pages.push({
        pageNumber: pageImg.pageNumber,
        found: false,
        confidence: 0,
        description: `Erreur : ${err instanceof Error ? err.message : "inconnue"}`,
      });
    }
  }

  const foundPages = pages.filter((p) => p.found);
  const maxConfidence = foundPages.length > 0
    ? Math.max(...foundPages.map((p) => p.confidence))
    : 0;

  return {
    found: foundPages.length > 0,
    confidence: maxConfidence,
    pages,
  };
}
