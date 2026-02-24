"use client";

import { useEffect, useRef } from "react";

interface PdfViewerProps {
  imageData: ImageData;
  label?: string;
  className?: string;
}

export default function PdfViewer({ imageData, label, className = "" }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
          {label}
        </p>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto border border-slate-200 rounded-lg"
      />
    </div>
  );
}
