"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { FileDown, FileSpreadsheet, Upload, Undo2 } from "lucide-react";

type Resultado = {
  importId: string;
  criadas: number;
  exigenciasCriadas: number;
  erros: string[];
  fileName: string;
};

export function ImportarTarefasXlsx() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/tarefas/importar", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error ?? "Erro ao importar planilha", "error");
      } else {
        setResultado(d);
        if (d.criadas > 0) toast(`${d.criadas} tarefa(s) importada(s)`, "success");
        else toast(d.erros?.length ? d.erros[0] : "Nenhuma tarefa importada", "warning");
        router.refresh();
      }
    } catch {
      toast("Erro ao importar planilha", "error");
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function desfazer() {
    if (!resultado) return;
    if (!confirm(`Desfazer a importação de ${resultado.criadas} tarefa(s)?`)) return;
    setDesfazendo(true);
    const res = await fetch("/api/tarefas/desfazer-importacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importId: resultado.importId }),
    });
    setDesfazendo(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast(`${d.removidas} tarefa(s) removida(s)`, "success");
      setResultado(null);
      router.refresh();
    } else {
      toast(d.error ?? "Erro ao desfazer importação", "error");
    }
  }

  return (
    <>
      <Link
        href="/api/tarefas/modelo"
        className="focus-ring transition-brand inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        title="Baixar planilha modelo"
      >
        <FileDown size={15} />
        <span className="hidden sm:inline">Modelo XLSX</span>
      </Link>

      <label
        className={`focus-ring transition-brand inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] ${lendo ? "opacity-60" : ""}`}
        title="Importar tarefas de uma planilha"
      >
        <Upload size={15} />
        <span className="hidden sm:inline">{lendo ? "Importando..." : "Importar XLSX"}</span>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={lendo} />
      </label>

      {resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[var(--color-brand-600)]" />
              <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Resultado da importação</h3>
            </div>

            <div className="space-y-1 text-sm text-[var(--color-ink-700)]">
              <p>
                <strong>{resultado.criadas}</strong> tarefa(s) criada(s) em &quot;{resultado.fileName}&quot;
                {resultado.exigenciasCriadas > 0 && <> · <strong>{resultado.exigenciasCriadas}</strong> exigência(s) espelhada(s)</>}
              </p>
              {resultado.erros.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-amber-800">Avisos ({resultado.erros.length}):</p>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700">
                    {resultado.erros.slice(0, 50).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {resultado.criadas > 0 && (
                <button
                  type="button"
                  onClick={desfazer}
                  disabled={desfazendo}
                  className="focus-ring transition-brand inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Undo2 size={14} />
                  {desfazendo ? "Desfazendo..." : "Desfazer importação"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setResultado(null)}
                className="focus-ring transition-brand rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
