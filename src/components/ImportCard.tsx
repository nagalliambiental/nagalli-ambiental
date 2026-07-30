"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Download, FileText } from "lucide-react";

interface ImportCardProps {
  importEndpoint: string;
  exportEndpoint?: string;
  modelEndpoint?: string;
  title?: string;
}

export function ImportCard({ importEndpoint, exportEndpoint, modelEndpoint, title = "Importar planilha" }: ImportCardProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(file: File) {
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(importEndpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar");
      setResult(`${data.importados} registro(s) importados.`);
    } catch (err) {
      setResult(`Erro: ${(err as Error).message}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
        <FileText size={16} />
        {title}
      </h3>
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
          }}
          className="text-sm"
          disabled={importing}
        />
        {importing && <Loader2 size={16} className="animate-spin text-[var(--color-brand-500)]" />}
        {exportEndpoint && (
          <a
            href={exportEndpoint}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <Download size={14} />
            Exportar
          </a>
        )}
        {modelEndpoint && (
          <a
            href={modelEndpoint}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <Download size={14} />
            Modelo
          </a>
        )}
      </div>
      {result && (
        <p className={`mt-2 text-sm ${result.startsWith("Erro") ? "text-red-600" : "text-[var(--color-brand-600)]"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
