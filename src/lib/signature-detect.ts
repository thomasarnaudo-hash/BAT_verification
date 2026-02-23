import { PDFDocument, PDFName } from "pdf-lib";
import { DigitalSignatureResult } from "@/types";

/**
 * Detect digital signatures in a PDF by looking for /Sig fields.
 * Runs server-side.
 */
export async function detectDigitalSignature(
  pdfBytes: ArrayBuffer
): Promise<DigitalSignatureResult> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const sigFields = fields.filter((field) => {
      const dict = field.acroField.dict;
      const ft = dict.get(PDFName.of("FT"));
      return ft?.toString() === "/Sig";
    });

    if (sigFields.length > 0) {
      return {
        found: true,
        count: sigFields.length,
        details: sigFields.map(
          (f) => `Champ signature : "${f.getName()}"`
        ),
      };
    }

    return { found: false, count: 0, details: [] };
  } catch {
    return { found: false, count: 0, details: ["Pas de formulaire détecté"] };
  }
}
