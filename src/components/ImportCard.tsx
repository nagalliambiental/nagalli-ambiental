"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Download, ChevronDown } from "lucide-react";

interface ImportCardProps {
  importEndpoint: string;
  exportEndpoint?: string;
  modelEndpoint?: string;
}

export function ImportCard({ importEndpoint, exportEndpoint, modelEndpoint }: ImportCardProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Upload size={14} />
            Importar
            <ChevronDown size={12} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-[var(--color-paper-200)] bg-white shadow-lg">
              {modelEndpoint && (
                <a
                  href={modelEndpoint}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                >
                  <Download size={14} />
                  Baixar modelo
                </a>
              )}
              <label className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                <Upload size={14} />
                Fazer upload
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    setMenuOpen(false);
                  }}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>
          )}
        </div>

        {exportEndpoint && (
          <a
            href={exportEndpoint}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <Download size={14} />
            Exportar
          </a>
        )}

        {importing && <Loader2 size={16} className="animate-spin text-[var(--color-brand-500)]" />}
      </div>

      {result && (
        <p className={`mt-2 text-sm ${result.startsWith("Erro") ? "text-red-600" : "text-[var(--color-brand-600)]"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
