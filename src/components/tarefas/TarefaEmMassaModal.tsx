"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { ClipboardList, X } from "lucide-react";
import type { OpcaoIdNome, OpcaoProcesso } from "@/components/tarefas/LinhaTarefa";

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-xs font-medium text-[var(--color-ink-700)] mb-1";

export function TarefaEmMassaModal({
  processos,
  responsaveis,
}: {
  processos: OpcaoProcesso[];
  responsaveis: OpcaoIdNome[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    observacoes: "",
    responsavelId: responsaveis[0] ? String(responsaveis[0].id) : "",
    prazoFinal: "",
    alertaPrazoFinal: "30",
    prioridade: "media",
    status: "nao_iniciado",
  });

  const filtrados = busca.trim()
    ? processos.filter((p) => {
        const alvo = `${p.numProtocolo} ${p.numLicenca ?? ""} ${p.empreendimento?.apelido ?? ""}`.toLowerCase();
        return alvo.includes(busca.trim().toLowerCase());
      })
    : processos;

  function alternar(id: number) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function alternarTodos() {
    const ids = filtrados.map((p) => p.id);
    const todos = ids.every((id) => selecionados.includes(id));
    setSelecionados((s) => (todos ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return toast("Título é obrigatório", "error");
    if (!form.responsavelId) return toast("Responsável é obrigatório", "error");
    if (selecionados.length === 0) return toast("Selecione ao menos uma licença", "error");

    setSaving(true);
    const res = await fetch("/api/tarefas/massa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        responsavelId: Number(form.responsavelId),
        alertaPrazoFinal: Number(form.alertaPrazoFinal) || 30,
        prazoFinal: form.prazoFinal || null,
        processoIds: selecionados,
      }),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast(`${d.criadas} tarefa(s) criada(s)`, "success");
      setOpen(false);
      setSelecionados([]);
      setForm((f) => ({ ...f, titulo: "", descricao: "", observacoes: "" }));
      router.refresh();
    } else {
      toast(d.error ?? "Erro ao criar tarefas em massa", "error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring transition-brand inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        title="Criar tarefas em várias licenças"
      >
        <ClipboardList size={15} />
        <span className="hidden sm:inline">Em massa</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={salvar} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Criar tarefas em massa</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Título *</label>
                <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Responsável *</label>
                  <select value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))} className={inputClass} required>
                    {responsaveis.map((r) => (
                      <option key={r.id} value={r.id}>{r.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Prazo Final</label>
                  <input type="date" value={form.prazoFinal} onChange={(e) => setForm((f) => ({ ...f, prazoFinal: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Alerta (dias)</label>
                  <input type="number" min={0} value={form.alertaPrazoFinal} onChange={(e) => setForm((f) => ({ ...f, alertaPrazoFinal: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Prioridade</label>
                  <select value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))} className={inputClass}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                    <option value="nao_iniciado">Não iniciado</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="para_revisao">Para revisão</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-paper-200)]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-3 py-2">
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar licença..."
                    className="w-full rounded-md border border-[var(--color-paper-200)] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                  <button type="button" onClick={alternarTodos} className="shrink-0 text-xs font-medium text-[var(--color-brand-600)] hover:underline">
                    {filtrados.length > 0 && filtrados.every((p) => selecionados.includes(p.id)) ? "Limpar" : "Todos"}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto p-2">
                  {filtrados.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-[var(--color-ink-500)]">                Nenhuma licença encontrada.</p>
                  )}
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {filtrados.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-paper-50)]">
                          <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => alternar(p.id)} className="accent-[var(--color-brand-500)]" />
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{p.numLicenca || p.numProtocolo}</span>
                            {p.empreendimento && <span className="text-[var(--color-ink-500)]"> · {p.empreendimento.apelido}</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-[var(--color-paper-200)] px-3 py-1.5 text-xs text-[var(--color-ink-500)]">
                  {selecionados.length} licença(s) selecionada(s)
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="focus-ring transition-brand rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
                {saving ? "Criando..." : `Criar tarefas (${selecionados.length})`}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
