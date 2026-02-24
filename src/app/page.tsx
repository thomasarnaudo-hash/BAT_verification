"use client";

import { useState, useEffect, useCallback } from "react";
import { Reference } from "@/types";
import { parseFilename } from "@/lib/metadata";
import ReferenceCard from "@/components/ReferenceCard";
import FileUpload from "@/components/FileUpload";

export default function Dashboard() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");

  const fetchReferences = useCallback(async () => {
    try {
      const res = await fetch("/api/references");
      if (res.ok) {
        setReferences(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch references:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setError("");
    // Pre-fill form from filename
    const parsed = parseFilename(file.name);
    if (parsed) {
      setFormSku(parsed.sku);
      setFormName(`${parsed.productName} — ${parsed.description}`);
    } else {
      setFormSku("");
      setFormName("");
    }
  };

  const handleAddReference = async () => {
    if (!selectedFile) return;
    if (!formName.trim()) {
      setError("Le nom de la référence est obligatoire.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const sku = formSku.trim() || crypto.randomUUID().slice(0, 8).toUpperCase();
      formData.append("sku", sku);
      formData.append("productName", formName.trim());

      const res = await fetch("/api/references", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setShowAdd(false);
        setSelectedFile(null);
        setFormSku("");
        setFormName("");
        await fetchReferences();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Erreur serveur (${res.status}). Vérifiez que Blob Storage est configuré sur Vercel.`);
      }
    } catch (err) {
      console.error("Failed to add reference:", err);
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (sku: string) => {
    if (!confirm(`Supprimer la référence ${sku} ?`)) return;
    try {
      await fetch(`/api/references/${encodeURIComponent(sku)}`, {
        method: "DELETE",
      });
      await fetchReferences();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const filtered = references.filter(
    (r) =>
      r.sku.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Références BAT</h1>
          <p className="text-slate-500 text-sm mt-1">
            {references.length} référence{references.length !== 1 ? "s" : ""} enregistrée{references.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showAdd ? "Annuler" : "+ Ajouter une référence"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-6 bg-white rounded-xl border border-slate-200">
          <h2 className="font-semibold text-slate-900 mb-3">
            Ajouter un BAT de référence
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Le SKU, nom du produit et langues seront extraits automatiquement du nom de fichier.
          </p>
          <FileUpload
            onFileSelected={handleFileSelected}
            loading={false}
            accept=".pdf"
          />

          {selectedFile && (
            <div className="mt-4 space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-400 truncate">
                Fichier : {selectedFile.name}
              </p>
              <div>
                <label htmlFor="refName" className="block text-sm font-medium text-slate-700 mb-1">
                  Nom de la référence *
                </label>
                <input
                  id="refName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex : Sachet Gel mains — 1 mois retail"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="refSku" className="block text-sm font-medium text-slate-700 mb-1">
                  SKU (optionnel, auto-détecté)
                </label>
                <input
                  id="refSku"
                  type="text"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="Ex : 1V13BR03DQ23"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddReference}
                disabled={uploading || !formName.trim()}
                className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? "Enregistrement..." : "Enregistrer comme référence"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher par SKU, nom de produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm mt-3">Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg mb-2">
            {search ? "Aucun résultat" : "Aucune référence"}
          </p>
          <p className="text-slate-400 text-sm">
            {search
              ? "Essayez un autre terme de recherche."
              : "Ajoutez votre premier BAT de référence pour commencer."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ref) => (
            <ReferenceCard
              key={ref.sku}
              reference={ref}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
