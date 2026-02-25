import { NextRequest, NextResponse } from "next/server";
import { checkSpelling } from "@/lib/spellcheck";

// Mots INCI courants (ingrédients cosmétiques en latin/chimique) à ignorer
const INCI_PATTERN =
  /\b(sodium|potassium|aqua|parfum|citric|acid|sulfate|chloride|benzoate|sorbate|bicarbonate|gluconate|citrate|betaine|cocamidopropyl|coco|xanthan|gum|fragrance|olea|europaea|olive|fruit|oil|tocopherol|glycerin|aloe|barbadensis|leaf|juice|cocos|nucifera|prunus|amygdalus|dulcis|butyrospermum|parkii|shea|helianthus|annuus|seed|simmondsia|chinensis|jojoba|rosa|canina|rosehip|lavandula|angustifolia|melaleuca|alternifolia|tea\s+tree|chamomilla|recutita|calendula|officinalis|centella|asiatica|panthenol|niacinamide|hyaluronic|retinol|ascorbic|linalool|limonene|citronellol|geraniol|eugenol|coumarin|benzyl|salicylate|hexyl|cinnamal)\b/i;

// POST /api/spellcheck — check text for spelling errors
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const errors = await checkSpelling(text, "auto");

    // Filtrer les faux positifs INCI (mots d'ingrédients cosmétiques)
    const filtered = errors.filter((e) => !INCI_PATTERN.test(e.word));

    return NextResponse.json({
      errors: filtered,
      totalErrors: filtered.length,
    });
  } catch (err) {
    console.error("Spellcheck failed:", err);
    return NextResponse.json({ errors: [], totalErrors: 0 });
  }
}
