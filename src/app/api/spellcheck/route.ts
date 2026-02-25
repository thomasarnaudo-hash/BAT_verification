import { NextRequest, NextResponse } from "next/server";
import { checkSpelling } from "@/lib/spellcheck";

// Mots INCI courants (ingrédients cosmétiques en latin/chimique)
const INCI_PATTERN =
  /\b(sodium|potassium|aqua|parfum|citric|acid|sulfate|chloride|benzoate|sorbate|bicarbonate|gluconate|citrate|betaine|cocamidopropyl|coco|xanthan|gum|fragrance|olea|europaea|olive|fruit|oil|tocopherol|glycerin|aloe|barbadensis|leaf|juice|cocos|nucifera|prunus|amygdalus|dulcis|butyrospermum|parkii|shea|helianthus|annuus|seed|simmondsia|chinensis|jojoba|rosa|canina|rosehip|lavandula|angustifolia|melaleuca|alternifolia|chamomilla|recutita|calendula|officinalis|centella|asiatica|panthenol|niacinamide|hyaluronic|retinol|ascorbic|linalool|limonene|citronellol|geraniol|eugenol|coumarin|benzyl|salicylate|hexyl|cinnamal)\b/i;

// Codes SKU 900.care : lettres + chiffres mélangés, ex: 1V13BR03DQ23
const SKU_PATTERN = /^[A-Z0-9]{8,}$/i;

// Mots métier 900.care
const BRAND_WORDS = new Set([
  "éco-recharger", "éco-recharge", "éco-rechargeable",
  "ecorefill", "900care",
]);

// Règles LanguageTool françaises à ignorer sur du texte bilingue packaging
// Ces règles de mise en forme FR ne s'appliquent pas au texte EN
const IGNORED_RULES = new Set([
  "FRENCH_WHITESPACE",       // espace insécable avant ? ! : ;
  "FR_TYPOGRAPHY",           // typographie française
  "UNPAIRED_BRACKETS",       // faux positifs sur packaging
]);

function isFalsePositive(word: string, rule: string): boolean {
  // Règles FR de mise en forme → toujours ignorer sur packaging bilingue
  if (IGNORED_RULES.has(rule)) return true;
  // INCI / ingrédients
  if (INCI_PATTERN.test(word)) return true;
  // Codes SKU (majuscules + chiffres mélangés, 8+ chars)
  if (SKU_PATTERN.test(word)) return true;
  // Mots métier
  if (BRAND_WORDS.has(word.toLowerCase())) return true;
  // Codes-barres / numéros purs
  if (/^[\d\s]+$/.test(word)) return true;
  // Mesures et unités (24g, 0.85oz, 240ml, 8.12, fl.oz, etc.)
  if (/^[\d.,]+\s*(g|oz|ml|mL|fl\.?oz|mm|cm|kg|lb)?\??$/i.test(word)) return true;
  return false;
}

// POST /api/spellcheck — check text for spelling errors (packaging bilingue FR/EN)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    // Vérifier en FR et EN séparément, ne garder que les erreurs
    // qui apparaissent dans LES DEUX langues (= vraie faute)
    const [frErrors, enErrors] = await Promise.all([
      checkSpelling(text, "fr"),
      checkSpelling(text, "en-US"),
    ]);

    // Créer un set des mots signalés en anglais (offset:length)
    const enErrorKeys = new Set(
      enErrors.map((e) => `${e.offset}:${e.length}`)
    );

    // Ne garder que les erreurs FR qui sont AUSSI signalées en EN
    // = le mot n'existe ni en français ni en anglais = vraie faute
    const realErrors = frErrors.filter((e) => {
      const key = `${e.offset}:${e.length}`;
      return enErrorKeys.has(key);
    });

    // Appliquer les filtres métier (INCI, SKU, etc.)
    const filtered = realErrors.filter(
      (e) => !isFalsePositive(e.word, e.rule)
    );

    return NextResponse.json({
      errors: filtered,
      totalErrors: filtered.length,
    });
  } catch (err) {
    console.error("Spellcheck failed:", err);
    return NextResponse.json({ errors: [], totalErrors: 0 });
  }
}
