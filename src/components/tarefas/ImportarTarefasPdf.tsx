"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Upload } from "lucide-react";

type ItemTarefa = {
  titulo: string;
  descricao: string;
  prazo: string | null;
};

export function ImportarTarefasPdf({
  processoId,
  responsaveis,
}: {
  processoId: number;
  responsaveis: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<ItemTarefa[]>([]);
  const [responsavelId, setResponsavelId] = useState(responsaveis[0] ? String(responsaveis[0].id) : "");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/processos/${processoId}/tarefas/importar-pdf`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setItens(d.itens ?? []);
        setOpen(true);
        if ((d.itens ?? []).length === 0) toast("Nenhuma tarefa identificada", "warning");
      } else {
        toast(d.error ?? "Erro ao ler o documento", "error");
      }
    } catch {
      toast("Erro ao ler o documento", "error");
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function criarTarefas() {
    if (!responsavelId) {
      toast("Selecione o responsável", "error");
      return;
    }
    setSalvando(true);
    let criadas = 0;
    try {
      for (const it of itens) {
        const res = await fetch(`/api/processos/${processoId}/tarefas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: it.titulo,
            descricao: it.descricao,
            responsavelId: Number(responsavelId),
            prazoData: it.prazo || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Erro ao criar tarefa");
        }
        criadas++;
      }
      toast(`${criadas} tarefa(s) criada(s)`, "success");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao criar tarefas", "error");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <label className="focus-ring transition-brand inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
        <Upload size={15} />
        {lendo ? "Lendo..." : "Importar PDF"}
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFile} disabled={lendo} />
      </label>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Tarefas identificadas no documento</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]">
                ✕
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--color-ink-500)]">Revise e ajuste cada tarefa antes de importar.</p>

            <div className="mb-3">
              <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">Responsável pela Execução *</label>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
              >
                <option value="">Selecione...</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {itens.map((it, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">Título</label>
                    <input
                      value={it.titulo}
                      onChange={(e) => setItens((arr) => arr.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">Descrição</label>
                    <textarea
                      value={it.descricao}
                      onChange={(e) => setItens((arr) => arr.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))}
                      rows={2}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">Prazo</label>
                    <input
                      type="date"
                      value={it.prazo ?? ""}
                      onChange={(e) => setItens((arr) => arr.map((x, j) => (j === i ? { ...x, prazo: e.target.value || null } : x)))}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criarTarefas}
                disabled={salvando}
                className="focus-ring transition-brand rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
              >
                {salvando ? "Importando..." : `Criar tarefas (${itens.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
