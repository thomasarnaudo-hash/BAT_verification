import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Extraire le texte d'une image de page PDF via Gemini Vision (OCR).
 * Renvoie le texte brut tel que lu sur l'image.
 */
export async function ocrPageImage(base64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurée");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: base64,
      },
    },
    `Tu es un outil d'OCR. Extrais TOUT le texte visible sur cette image d'un packaging/étiquette.
Règles :
- Retranscris le texte EXACTEMENT comme il apparaît (orthographe, casse, ponctuation)
- Inclus TOUTES les langues présentes (français, anglais, etc.)
- Sépare les blocs de texte par des sauts de ligne
- N'ajoute AUCUN commentaire, titre ou explication — uniquement le texte brut extrait
- Pour les séparateurs visuels (points, barres, puces), utilise le caractère "/"
- Inclus les codes-barres et numéros visibles`,
  ]);

  return result.response.text().trim();
}
