"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface ResponsavelOption {
  id: number;
  nome: string;
  funcao?: string;
}

interface EmpreendimentoOption {
  id: number;
  apelido: string;
}

export interface TarefaFormInitial {
  id: number;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  prazoFinal: string | null;
  alertaPrazoFinal: number;
  dataLimite: string | null;
  alertaDataLimite: number;
  responsavelId: number;
  empreendimentoId: number | null;
}

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "iniciada", label: "Iniciada" },
  { value: "concluida", label: "Concluída" },
];

const PRIORIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-sm font-medium text-[var(--color-ink-700)] mb-1";

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tzoffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 10);
}

export default function TarefaForm({
  modo,
  endpoint,
  redirectTo,
  initial,
}: {
  modo: "novo" | "editar";
  endpoint: string;
  redirectTo: string;
  initial?: TarefaFormInitial;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: initial?.titulo ?? "",
    descricao: initial?.descricao ?? "",
    responsavelId: initial ? String(initial.responsavelId) : "",
    empreendimentoId: initial?.empreendimentoId ? String(initial.empreendimentoId) : "",
    prazoFinal: toDateInput(initial?.prazoFinal),
    alertaPrazoFinal: String(initial?.alertaPrazoFinal ?? 30),
    dataLimite: toDateInput(initial?.dataLimite),
    alertaDataLimite: String(initial?.alertaDataLimite ?? 30),
    prioridade: initial?.prioridade ?? "media",
    status: initial?.status ?? "pendente",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/responsaveis").then((r) => r.json()),
      fetch("/api/empreendimentos").then((r) => r.json()),
    ])
      .then(([resp, emp]) => {
        setResponsaveis(resp);
        setEmpreendimentos(emp);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      responsavelId: Number(form.responsavelId),
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      prazoFinal: form.prazoFinal || null,
      alertaPrazoFinal: Number(form.alertaPrazoFinal) || 0,
      dataLimite: form.dataLimite || null,
      alertaDataLimite: Number(form.alertaDataLimite) || 0,
      prioridade: form.prioridade,
      status: form.status,
    };
    const res = await fetch(endpoint, {
      method: modo === "editar" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Erro ao salvar tarefa", "error");
      return;
    }
    toast("Tarefa salva com sucesso", "success");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
      <div>
        <label className={labelClass}>Título</label>
        <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Descrição</label>
        <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Responsável pela Execução</label>
          <select value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })} className={inputClass} required>
            <option value="">Selecione...</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}{r.funcao ? ` — ${r.funcao}` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Empreendimento</label>
          <select value={form.empreendimentoId} onChange={(e) => setForm({ ...form, empreendimentoId: e.target.value })} className={inputClass}>
            <option value="">Selecione...</option>
            {empreendimentos.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.apelido}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Prazo Final</label>
          <input type="date" value={form.prazoFinal} onChange={(e) => setForm({ ...form, prazoFinal: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Alerta (dias antes do prazo)</label>
          <input type="number" min={0} value={form.alertaPrazoFinal} onChange={(e) => setForm({ ...form, alertaPrazoFinal: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Data Limite</label>
          <input type="date" value={form.dataLimite} onChange={(e) => setForm({ ...form, dataLimite: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Alerta (dias antes da data limite)</label>
          <input type="number" min={0} value={form.alertaDataLimite} onChange={(e) => setForm({ ...form, alertaDataLimite: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Prioridade</label>
          <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className={inputClass}>
            {PRIORIDADE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => router.back()} className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
          Cancelar
        </button>
      </div>
    </form>
  );
}