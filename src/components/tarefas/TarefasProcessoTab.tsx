"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Plus, X, ListTodo } from "lucide-react";
import {
  LinhaTarefa,
  type LinhaTarefaTarefa,
  type OpcaoIdNome,
  type OpcaoProcesso,
} from "@/components/tarefas/LinhaTarefa";
import { ImportarTarefasPdf } from "@/components/tarefas/ImportarTarefasPdf";

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-xs font-medium text-[var(--color-ink-700)] mb-1";

export function TarefasProcessoTab({
  processoId,
  tarefas,
  responsaveis,
  empreendimentos,
  processos,
}: {
  processoId: number;
  tarefas: LinhaTarefaTarefa[];
  responsaveis: OpcaoIdNome[];
  empreendimentos: { id: number; apelido: string }[];
  processos: OpcaoProcesso[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    observacoes: "",
    prazoFinal: "",
    alertaPrazoFinal: "30",
    dataLimite: "",
    alertaDataLimite: "30",
    prioridade: "media",
    status: "nao_iniciado",
    responsavelId: responsaveis[0] ? String(responsaveis[0].id) : "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return toast("Título é obrigatório", "error");
    if (!form.responsavelId) return toast("Responsável é obrigatório", "error");

    setSaving(true);
    const res = await fetch(`/api/processos/${processoId}/tarefas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        responsavelId: Number(form.responsavelId),
        prazoFinal: form.prazoFinal || null,
        dataLimite: form.dataLimite || null,
        alertaPrazoFinal: Number(form.alertaPrazoFinal) || 30,
        alertaDataLimite: Number(form.alertaDataLimite) || 30,
        descricao: form.descricao || null,
        observacoes: form.observacoes || null,
      }),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast("Tarefa criada", "success");
      setForm((f) => ({ ...f, titulo: "", descricao: "", observacoes: "" }));
      setShow(false);
      router.refresh();
    } else {
      toast(d.error ?? "Erro ao criar tarefa", "error");
    }
  }

  const abertas = tarefas.filter((t) => t.status !== "concluida");
  const concluidas = tarefas.filter((t) => t.status === "concluida");

  return (
    <div className="space-y-6">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-paper-200)] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] flex items-center gap-2">
            <ListTodo size={16} />
            Tarefas e prazos
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ImportarTarefasPdf processoId={processoId} responsaveis={responsaveis} />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="focus-ring transition-brand inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              {show ? <X size={15} /> : <Plus size={15} />}
              {show ? "Cancelar" : "Tarefa"}
            </button>
          </div>
        </div>

        {show && (
          <form onSubmit={handleSubmit} className="space-y-3 border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-5">
            <div>
              <label className={labelClass}>Título *</label>
              <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Prazo Final</label>
                <input type="date" value={form.prazoFinal} onChange={(e) => setForm((f) => ({ ...f, prazoFinal: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Alerta (dias)</label>
                <input type="number" min={0} value={form.alertaPrazoFinal} onChange={(e) => setForm((f) => ({ ...f, alertaPrazoFinal: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Limite de Execução</label>
                <input type="date" value={form.dataLimite} onChange={(e) => setForm((f) => ({ ...f, dataLimite: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Alerta (dias)</label>
                <input type="number" min={0} value={form.alertaDataLimite} onChange={(e) => setForm((f) => ({ ...f, alertaDataLimite: e.target.value }))} className={inputClass} />
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
                <label className={labelClass}>Responsável *</label>
                <select value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))} className={inputClass} required>
                  {responsaveis.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
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
            <div>
              <label className={labelClass}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className={inputClass} />
            </div>
            <div>
              <button
                type="submit"
                disabled={saving}
                className="focus-ring transition-brand rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Adicionar tarefa"}
              </button>
            </div>
          </form>
        )}

        <div>
          {abertas.map((t) => (
            <LinhaTarefa key={t.id} tarefa={t} responsaveis={responsaveis} empreendimentos={empreendimentos} processos={processos} />
          ))}
          {abertas.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-500)]">Nenhuma tarefa em aberto.</p>
          )}
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <div className="border-b border-[var(--color-paper-200)] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Finalizadas</h2>
        </div>
        <div>
          {concluidas.map((t) => (
            <LinhaTarefa key={t.id} tarefa={t} responsaveis={responsaveis} empreendimentos={empreendimentos} processos={processos} />
          ))}
          {concluidas.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-500)]">Nenhuma tarefa finalizada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
