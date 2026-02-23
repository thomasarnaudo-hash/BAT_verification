import { put, list, del, head } from "@vercel/blob";
import { MetadataStore, Reference } from "@/types";

const METADATA_PATH = "metadata.json";

// === Metadata (our "database") ===

export async function getMetadata(): Promise<MetadataStore> {
  try {
    const blobs = await list({ prefix: METADATA_PATH });
    const metaBlob = blobs.blobs.find((b) => b.pathname === METADATA_PATH);
    if (!metaBlob) {
      return { references: [], updatedAt: new Date().toISOString() };
    }
    const res = await fetch(metaBlob.url);
    return (await res.json()) as MetadataStore;
  } catch {
    return { references: [], updatedAt: new Date().toISOString() };
  }
}

export async function saveMetadata(store: MetadataStore): Promise<void> {
  store.updatedAt = new Date().toISOString();
  const blob = new Blob([JSON.stringify(store, null, 2)], {
    type: "application/json",
  });
  await put(METADATA_PATH, blob, {
    access: "public",
    addRandomSuffix: false,
  });
}

// === References ===

export async function getReferences(): Promise<Reference[]> {
  const meta = await getMetadata();
  return meta.references;
}

export async function getReference(sku: string): Promise<Reference | null> {
  const meta = await getMetadata();
  return meta.references.find((r) => r.sku === sku) || null;
}

export async function addReference(ref: Reference): Promise<void> {
  const meta = await getMetadata();
  const existing = meta.references.findIndex((r) => r.sku === ref.sku);
  if (existing >= 0) {
    meta.references[existing] = ref;
  } else {
    meta.references.push(ref);
  }
  await saveMetadata(meta);
}

export async function deleteReference(sku: string): Promise<void> {
  const meta = await getMetadata();
  meta.references = meta.references.filter((r) => r.sku !== sku);
  await saveMetadata(meta);

  // Delete blobs
  const blobs = await list({ prefix: `references/${sku}/` });
  for (const blob of blobs.blobs) {
    await del(blob.url);
  }
}

// === PDF files ===

export async function uploadReferencePdf(
  sku: string,
  file: Buffer | Blob,
  filename: string
): Promise<string> {
  const blob = await put(`references/${sku}/current.pdf`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/pdf",
  });
  return blob.url;
}

export async function archiveCurrentPdf(
  sku: string,
  version: number
): Promise<void> {
  // Download current PDF
  const blobs = await list({ prefix: `references/${sku}/current.pdf` });
  const currentBlob = blobs.blobs.find(
    (b) => b.pathname === `references/${sku}/current.pdf`
  );
  if (!currentBlob) return;

  const res = await fetch(currentBlob.url);
  const data = await res.arrayBuffer();

  const date = new Date().toISOString().split("T")[0];
  await put(
    `references/${sku}/history/v${version}_${date}.pdf`,
    new Blob([data]),
    {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/pdf",
    }
  );
}

export async function uploadTempPdf(
  id: string,
  file: Buffer | Blob
): Promise<string> {
  const blob = await put(`temp/${id}.pdf`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/pdf",
  });
  return blob.url;
}

export async function deleteTempPdf(id: string): Promise<void> {
  const blobs = await list({ prefix: `temp/${id}.pdf` });
  for (const blob of blobs.blobs) {
    await del(blob.url);
  }
}
