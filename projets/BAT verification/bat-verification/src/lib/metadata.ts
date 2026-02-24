import { ParsedFilename } from "@/types";

/**
 * Parse a BAT filename to extract structured info.
 * Expected format: SKU_{sku}_-_{productName}_-_{description}_-_{languages}_-_{date}.pdf
 * Example: SKU_1V13BR03DQ23_-_Sachet_Gel_mains_Lait_sulfates_-_1_mois_retail_-_ENFR_-_09.02.2026.pdf
 */
export function parseFilename(filename: string): ParsedFilename | null {
  // Remove extension and any trailing " (1)" etc from duplicated files
  const clean = filename.replace(/\.pdf$/i, "").replace(/\s*\(\d+\)$/, "");

  // Split by the separator pattern " - " or "_-_"
  const parts = clean.split(/_-_|(?<=[^_])\s-\s/);

  if (parts.length < 4) return null;

  // First part: "SKU_1V13BR03DQ23" → extract SKU
  const skuMatch = parts[0].match(/^SKU[_\s]?(.+)$/i);
  if (!skuMatch) return null;
  const sku = skuMatch[1].trim().replace(/_/g, "");

  // Second part: product name (replace underscores with spaces)
  const productName = parts[1].trim().replace(/_/g, " ");

  // Third part: description
  const description = parts[2].trim().replace(/_/g, " ");

  // Fourth part: languages (e.g., "ENFR" → ["EN", "FR"])
  const langRaw = parts[3].trim().replace(/_/g, "");
  const languages = parseLanguages(langRaw);

  // Fifth part (optional): date
  const date = parts[4]?.trim().replace(/_/g, ".") || "";

  return { sku, productName, description, languages, date };
}

function parseLanguages(raw: string): string[] {
  // Handle common patterns: "ENFR", "EN FR", "FR", "EN", "FREN"
  const upper = raw.toUpperCase();
  const langs: string[] = [];

  if (upper.includes("FR")) langs.push("FR");
  if (upper.includes("EN")) langs.push("EN");
  if (upper.includes("DE")) langs.push("DE");
  if (upper.includes("ES")) langs.push("ES");
  if (upper.includes("IT")) langs.push("IT");
  if (upper.includes("NL")) langs.push("NL");

  return langs.length > 0 ? langs : [raw];
}

/**
 * Generate a display name from a parsed filename
 */
export function displayName(parsed: ParsedFilename): string {
  return `${parsed.productName} — ${parsed.description}`;
}
