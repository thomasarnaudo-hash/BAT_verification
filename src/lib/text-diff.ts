import { diffWords } from "diff";
import { TextDiffResult, TextDiffPage, TextChange } from "@/types";

/**
 * Compare text extracted from two PDF versions page by page.
 */
export function compareText(
  refTexts: string[],
  newTexts: string[]
): TextDiffResult {
  const pageCount = Math.max(refTexts.length, newTexts.length);
  const pages: TextDiffPage[] = [];
  let totalChanges = 0;

  for (let i = 0; i < pageCount; i++) {
    const refText = refTexts[i] || "";
    const newText = newTexts[i] || "";

    const diff = diffWords(refText, newText);
    const changes: TextChange[] = diff.map((part) => ({
      type: part.added ? "added" : part.removed ? "removed" : "unchanged",
      value: part.value,
    }));

    const changesCount = changes.filter((c) => c.type !== "unchanged").length;
    totalChanges += changesCount;

    pages.push({
      pageNumber: i + 1,
      referenceText: refText,
      newText: newText,
      changes,
    });
  }

  return { pages, totalChanges };
}
