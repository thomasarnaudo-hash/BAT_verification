import { NextRequest, NextResponse } from "next/server";
import { checkSpelling } from "@/lib/spellcheck";

// Mots INCI courants (ingrédients cosmétiques en latin/chimique)
const INCI_PATTERN =
  /\b(sodium|potassium|aqua|parfum|citric|acid|sulfate|chloride|benzoate|sorbate|bicarbonate|gluconate|citrate|betaine|cocamidopropyl|coco|xanthan|gum|fragrance|olea|europaea|olive|fruit|oil|tocopherol|glycerin|aloe|barbadensis|leaf|juice|cocos|nucifera|prunus|amygdalus|dulcis|butyrospermum|parkii|shea|helianthus|annuus|seed|simmondsia|chinensis|jojoba|rosa|canina|rosehip|lavandula|angustifolia|melaleuca|alternifolia|tea\s+tree|chamomilla|recutita|calendula|officinalis|centella|asiatica|panthenol|niacinamide|hyaluronic|retinol|ascorbic|linalool|limonene|citronellol|geraniol|eugenol|coumarin|benzyl|salicylate|hexyl|cinnamal)\b/i;

// Codes SKU 900.care : lettres + chiffres, ex: 1V13BR03DQ23
const SKU_PATTERN = /^[A-Z0-9]{8,}$/;

// Mots métier 900.care à accepter
const BRAND_WORDS = new Set([
  "éco-recharger", "éco-recharge", "éco-rechargeable",
  "ecorefill", "900care",
]);

function isFalsePositive(word: string): boolean {
  // INCI / ingrédients
  if (INCI_PATTERN.test(word)) return true;
  // Codes SKU (majuscules + chiffres, 8+ chars)
  if (SKU_PATTERN.test(word)) return true;
  // Mots métier
  if (BRAND_WORDS.has(word.toLowerCase())) return true;
  // Codes-barres / numéros purs
  if (/^\d[\d\s]*$/.test(word)) return true;
  return false;
}

// POST /api/spellcheck — check text for spelling errors
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const errors = await checkSpelling(text, "auto");

    // Filtrer les faux positifs
    const filtered = errors.filter((e) => !isFalsePositive(e.word));

    return NextResponse.json({
      errors: filtered,
      totalErrors: filtered.length,
    });
  } catch (err) {
    console.error("Spellcheck failed:", err);
    return NextResponse.json({ errors: [], totalErrors: 0 });
  }
}
