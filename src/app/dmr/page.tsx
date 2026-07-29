"use client";

import { useState, useRef } from "react";
import { Topbar } from "@/components/Topbar";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock } from "lucide-react";
import { DmrRow } from "@/lib/dmr-parser";

export default function DmrPage() {
  const [rows, setRows] = useState<DmrRow[] | null>(null);
  const [ano, setAno] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentEmpresa, setCurrentEmpresa] = useState("");

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx")) {
      setError("Selecione um arquivo .xlsx");
      return;
    }
    setLoading(true);
    setError(null);
    setFilename(file.name);

    const form = new FormData();
    form.set("file", file);

    try {
      const res = await fetch("/api/dmr/parse", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar");
      }
      const data = await res.json();
      setRows(data.linhas);
      setAno(data.ano);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function statusIcon(val: string) {
    const s = val.trim().toLowerCase();
    if (s === "ok" || s === "ok (0)") return <CheckCircle2 size={14} className="text-green-600" />;
    if (s === "pendente") return <Clock size={14} className="text-amber-500" />;
    if (s === "-" || !s) return <span className="text-[var(--color-ink-300)]">—</span>;
    return <XCircle size={14} className="text-red-500" />;
  }

  const empresas = rows ? [...new Set(rows.map((r) => r.empresa))].sort() : [];
  const filtered = currentEmpresa
    ? rows?.filter((r) => r.empresa === currentEmpresa)
    : rows;

  return (
    <div>
      <Topbar title="DMR — Declaração Mensal de Resíduos" subtitle="Importe a planilha de conferência para acompanhar os trimestres" />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6 mb-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--color-paper-200)] p-8"
        >
          <div className="rounded-full bg-[var(--color-brand-50)] p-3">
            <Upload size={24} className="text-[var(--color-brand-600)]" />
          </div>
          <p className="text-sm text-[var(--color-ink-700)]">
            {filename || "Arraste a planilha ou clique para selecionar"}
          </p>
          <p className="text-xs text-[var(--color-ink-500)]">Apenas .xlsx (aba DMR)</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="focus-ring transition-brand rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {loading ? "Processando..." : "Selecionar arquivo"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      {rows && (
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">
              Situação por trimestre — {ano}
              <span className="ml-2 text-sm font-normal text-[var(--color-ink-500)]">{rows.length} unidade(s)</span>
            </h2>
            <select
              value={currentEmpresa}
              onChange={(e) => setCurrentEmpresa(e.target.value)}
              className="focus-ring rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-sm"
            >
              <option value="">Todas as empresas</option>
              {empresas.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                  <th className="text-left p-2 font-medium">Empresa</th>
                  <th className="text-left p-2 font-medium">Identificação</th>
                  <th className="text-left p-2 font-medium">Unidade</th>
                  <th className="text-center p-2 font-medium" colSpan={2}>1º Trim</th>
                  <th className="text-center p-2 font-medium" colSpan={2}>2º Trim</th>
                  <th className="text-center p-2 font-medium" colSpan={2}>3º Trim</th>
                  <th className="text-center p-2 font-medium" colSpan={2}>4º Trim</th>
                </tr>
                <tr className="border-b border-[var(--color-paper-100)] text-xs text-[var(--color-ink-400)]">
                  <th colSpan={3}></th>
                  <th className="p-1 text-center">DMR</th>
                  <th className="p-1 text-center">MTR</th>
                  <th className="p-1 text-center">DMR</th>
                  <th className="p-1 text-center">MTR</th>
                  <th className="p-1 text-center">DMR</th>
                  <th className="p-1 text-center">MTR</th>
                  <th className="p-1 text-center">DMR</th>
                  <th className="p-1 text-center">MTR</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-paper-50)] text-sm hover:bg-[var(--color-paper-50)]">
                    <td className="p-2 font-medium text-[var(--color-ink-900)]">{row.empresa}</td>
                    <td className="p-2">{row.identificacao}</td>
                    <td className="p-2 text-[var(--color-ink-500)]">{row.unidade}</td>
                    {row.trimestres.map((t, ti) => (
                      <td key={ti} className="p-2 text-center">
                        <span className="inline-flex items-center gap-1" title={`${t.label}: DMR=${t.dmr}, MTR=${t.mtr}`}>
                          {ti === 0 ? statusIcon(t.dmr) : statusIcon(t.dmr)}
                          <span className="text-xs">{t.dmr || "—"}</span>
                        </span>
                      </td>
                    ))}
                    {row.trimestres.map((t, ti) => (
                      <td key={ti} className="p-2 text-center">
                        <span className="inline-flex items-center gap-1">
                          {statusIcon(t.mtr)}
                          <span className="text-xs">{t.mtr || "—"}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
