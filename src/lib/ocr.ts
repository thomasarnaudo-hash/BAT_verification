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

const OCR_MULTI_PROMPT = `Tu es un outil d'OCR de haute précision pour du packaging cosmétique.
Voici un packaging vu sous 4 orientations différentes (0°, 90°, 180°, 270°).
Le texte peut être latéral, inversé ou sur les rabats — c'est pourquoi tu reçois 4 rotations.

Extrais TOUT le texte lisible en combinant les 4 images.

Règles strictes :
- Ne retranscris QUE l'alphabet latin (français, anglais, espagnol, etc.)
- IGNORE les caractères cyrilliques, thaïlandais, arabes, chinois ou tout alphabet non-latin
- IGNORE les artefacts visuels, le texte miroir illisible et le bruit
- Retranscris EXACTEMENT l'orthographe visible (accents, casse, ponctuation)
- Sépare les blocs de texte par des sauts de ligne
- N'ajoute AUCUN commentaire — uniquement le texte brut extrait
- Inclus les codes, numéros et codes-barres visibles
- Déduplique : si le même texte apparaît dans plusieurs orientations, ne le mets qu'une seule fois`;

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

/**
 * Nettoie la sortie OCR : supprime les caractères non-latins et les lignes de bruit.
 */
export function cleanOcrOutput(text: string): string {
  // Regex : caractères non-latins courants (cyrillique, thaï, arabe, CJK, devanagari, etc.)
  const nonLatinBlocks =
    /[\u0400-\u04FF\u0500-\u052F\u0E00-\u0E7F\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]/g;

  return text
    .split("\n")
    .map((line) => {
      // Compter les caractères latins vs non-latins sur la ligne
      const latinChars = line.replace(/[^a-zA-ZÀ-ÿ]/g, "").length;
      const nonLatinChars = (line.match(nonLatinBlocks) || []).length;
      // Supprimer la ligne si majoritairement non-latine
      if (nonLatinChars > 0 && nonLatinChars >= latinChars) {
        return "";
      }
      // Supprimer les caractères non-latins isolés restants
      return line.replace(nonLatinBlocks, "").trim();
    })
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * OCR multi-images : envoie 4 rotations d'un packaging à Gemini en un seul appel.
 * Retourne le texte nettoyé (latin uniquement).
 */
export async function ocrFromImages(images: string[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurée");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Construire les parts : les 4 images + le prompt
  const imageParts = images.map((base64) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: base64,
    },
  }));

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent([
        ...imageParts,
        OCR_MULTI_PROMPT,
      ]);
      const rawText = result.response.text().trim();
      return cleanOcrOutput(rawText);
    } catch (err) {
      const is429 =
        String(err).includes("429") ||
        String(err).includes("Resource exhausted");
      if (is429 && attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 2500;
        console.log(
          `OCR images rate limited, retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error("OCR images failed after retries");
}
