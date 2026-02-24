"use client";

import { useState } from "react";

interface FeedbackFormProps {
  sku: string;
  referenceBlobUrl: string;
  newBlobUrl: string;
}

export default function FeedbackForm({
  sku,
  referenceBlobUrl,
  newBlobUrl,
}: FeedbackFormProps) {
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    const subject = encodeURIComponent(`[BAT] Feedback — ${sku}`);
    const body = encodeURIComponent(
      `SKU : ${sku}\n` +
        `Date : ${new Date().toLocaleDateString("fr-FR")}\n\n` +
        `--- Commentaires ---\n${comment}\n\n` +
        `--- Liens PDFs ---\n` +
        `Reference : ${referenceBlobUrl}\n` +
        `Nouveau BAT : ${newBlobUrl}\n`
    );

    window.open(`mailto:thomas@900.care?subject=${subject}&body=${body}`, "_self");
    setSent(true);
  };

  return (
    <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Feedback
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Notez ce qui va ou ne va pas dans cette comparaison. Le feedback sera envoyé par email.
      </p>

      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSent(false);
        }}
        placeholder="Ex: le texte anglais contient des faux positifs, le diff visuel est correct..."
        rows={4}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={!comment.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Envoyer par email
        </button>
        {sent && (
          <span className="text-sm text-green-600">
            Client mail ouvert !
          </span>
        )}
      </div>
    </div>
  );
}
