import { GoogleGenerativeAI } from "@google/generative-ai";

const OCR_PROMPT = `Tu es un outil d'OCR de haute précision pour du packaging cosmétique.
Extrais TOUT le texte visible sur ce document, en scannant TOUTE la surface (gauche, droite, haut, bas).

Règles strictes :
- Retranscris EXACTEMENT l'orthographe visible (accents, casse, ponctuation)
- Inclus TOUTES les langues (français, anglais, etc.)
- Sépare les blocs de texte par des sauts de ligne
- N'ajoute AUCUN commentaire — uniquement le texte brut
- Inclus les codes, numéros et codes-barres visibles
- Scanne bien les petits textes et les bords`;

/**
 * Extraire le texte d'un PDF via Gemini Vision.
 * Le serveur télécharge le PDF depuis l'URL et l'envoie directement à Gemini.
 */
export async function ocrFromPdfUrl(pdfUrl: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurée");
  }

  // Télécharger le PDF côté serveur
  const pdfRes = await fetch(pdfUrl);
  if (!pdfRes.ok) {
    throw new Error(`Impossible de télécharger le PDF: ${pdfRes.status}`);
  }
  const pdfBuffer = await pdfRes.arrayBuffer();
  const base64 = Buffer.from(pdfBuffer).toString("base64");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    OCR_PROMPT,
  ]);

  return result.response.text().trim();
}
