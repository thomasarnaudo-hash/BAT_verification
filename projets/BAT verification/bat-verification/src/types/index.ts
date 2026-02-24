// === Reference (a stored BAT that serves as the "truth") ===

export interface Reference {
  sku: string;
  productName: string;
  description: string;
  languages: string[];
  currentVersion: number;
  lastValidatedAt: string; // ISO date
  validatedBy: string;
  signatureStatus: SignatureStatus;
  blobUrl: string; // URL of current.pdf in Vercel Blob
}

export interface MetadataStore {
  references: Reference[];
  updatedAt: string;
}

// === Parsed filename ===

export interface ParsedFilename {
  sku: string;
  productName: string;
  description: string;
  languages: string[];
  date: string;
}

// === Comparison results ===

export interface ComparisonResult {
  pixelDiff: PixelDiffResult;
  textDiff: TextDiffResult;
  spellCheck: SpellCheckResult;
  signature: SignatureResult;
  overallScore: number; // 0–100
}

export interface PixelDiffResult {
  pages: PixelDiffPage[];
  totalDiffPixels: number;
  totalPixels: number;
  similarityPercent: number;
}

export interface PixelDiffPage {
  pageNumber: number;
  referenceImage: ImageData;
  newImage: ImageData;
  diffImage: ImageData;
  diffPixels: number;
  totalPixels: number;
  similarityPercent: number;
  width: number;
  height: number;
}

export interface TextDiffResult {
  pages: TextDiffPage[];
  totalChanges: number;
}

export interface TextDiffPage {
  pageNumber: number;
  referenceText: string;
  newText: string;
  changes: TextChange[];
}

export interface TextChange {
  type: "added" | "removed" | "unchanged";
  value: string;
}

export interface SpellCheckResult {
  errors: SpellError[];
  totalErrors: number;
}

export interface SpellError {
  message: string;
  offset: number;
  length: number;
  word: string;
  suggestions: string[];
  rule: string;
  language: string;
  context: string;
}

// === Signature ===

export type SignatureStatus = "signed-digital" | "signed-handwritten" | "not-signed" | "unknown";

export interface SignatureResult {
  digital: DigitalSignatureResult;
  handwritten: HandwrittenSignatureResult;
  overallStatus: SignatureStatus;
}

export interface DigitalSignatureResult {
  found: boolean;
  count: number;
  details: string[];
}

export interface HandwrittenSignatureResult {
  found: boolean;
  confidence: number; // 0–1
  pages: HandwrittenSignaturePage[];
}

export interface HandwrittenSignaturePage {
  pageNumber: number;
  found: boolean;
  confidence: number;
  description: string;
}

// === Upload ===

export interface UploadedFile {
  id: string;
  filename: string;
  blobUrl: string;
  uploadedAt: string;
  parsed: ParsedFilename | null;
}
