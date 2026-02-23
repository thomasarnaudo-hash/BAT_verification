"use client";

import { useState, useRef, DragEvent } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  loading?: boolean;
  accept?: string;
  label?: string;
}

export default function FileUpload({
  onFileSelected,
  loading = false,
  accept = ".pdf",
  label = "Glissez un PDF ici ou cliquez pour sélectionner",
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      onFileSelected(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelected(file);
    }
  };

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
      } ${loading ? "opacity-50 cursor-wait" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Upload en cours...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-10 h-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
            />
          </svg>
          {fileName ? (
            <p className="text-sm font-medium text-blue-600">{fileName}</p>
          ) : (
            <p className="text-sm text-slate-500">{label}</p>
          )}
          <p className="text-xs text-slate-400">PDF uniquement</p>
        </div>
      )}
    </div>
  );
}
