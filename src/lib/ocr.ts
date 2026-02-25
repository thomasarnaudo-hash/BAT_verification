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
 * Inclut un retry automatique en cas de rate limit (429).
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

  // Retry avec backoff en cas de 429
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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
    } catch (err) {
      const is429 = String(err).includes("429") || String(err).includes("Resource exhausted");
      if (is429 && attempt < maxRetries - 1) {
        // Attendre avant de réessayer (2s, 5s)
        const delay = (attempt + 1) * 2500;
        console.log(`OCR rate limited, retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error("OCR failed after retries");
}
