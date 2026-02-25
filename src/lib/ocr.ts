import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Extraire le texte d'une image de page PDF via Gemini Vision (OCR).
 * Renvoie le texte brut tel que lu sur l'image.
 */
export async function ocrPageImage(base64: string, mimeType = "image/png"): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurée");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    `Tu es un outil d'OCR de haute précision pour du packaging cosmétique.
Extrais TOUT le texte visible sur cette image, en scannant TOUTE la surface (gauche, droite, haut, bas).

Règles strictes :
- Retranscris EXACTEMENT l'orthographe visible (accents, casse, ponctuation)
- Inclus TOUTES les langues (français, anglais, etc.)
- Sépare les blocs de texte par des sauts de ligne
- N'ajoute AUCUN commentaire — uniquement le texte brut
- Inclus les codes, numéros et codes-barres visibles
- Scanne bien les petits textes et les bords de l'image`,
  ]);

  return result.response.text().trim();
}
