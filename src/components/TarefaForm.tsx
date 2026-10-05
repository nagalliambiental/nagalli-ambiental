"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Paperclip } from "lucide-react";
import type { OpcaoProcesso } from "@/components/tarefas/LinhaTarefa";

interface ResponsavelOption {
  id: number;
  nome: string;
  funcao?: string;
}

interface EmpreendimentoOption {
  id: number;
  apelido: string;
}

interface CondicaoOption {
  id: number;
  nome: string;
}

export interface TarefaFormInitial {
  id: number;
  titulo: string;
  descricao: string | null;
  observacoes?: string | null;
  status: string;
  prioridade: string;
  prazoFinal: string | null;
  alertaPrazoFinal: number;
  dataLimite: string | null;
  alertaDataLimite: number;
  dataConclusao?: string | null;
  responsavelId: number;
  empreendimentoId: number | null;
  processoId?: number | null;
  condicionanteId?: number | null;
}

const STATUS_OPTIONS = [
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "para_revisao", label: "Para revisão" },
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

function rotuloProcesso(p: OpcaoProcesso): string {
  const num = p.numLicenca || p.numProtocolo;
  return p.empreendimento ? `${num} · ${p.empreendimento.apelido}` : num;
}

function paramsIniciais(): { processoId: string; condicionanteId: string } {
  if (typeof window === "undefined") return { processoId: "", condicionanteId: "" };
  const p = new URLSearchParams(window.location.search);
  return { processoId: p.get("processoId") ?? "", condicionanteId: p.get("condicionanteId") ?? "" };
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
  const [processos, setProcessos] = useState<OpcaoProcesso[]>([]);
  const [condicionantes, setCondicionantes] = useState<CondicaoOption[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const url = modo === "novo" ? paramsIniciais() : { processoId: "", condicionanteId: "" };
    return {
      titulo: initial?.titulo ?? "",
      descricao: initial?.descricao ?? "",
      observacoes: initial?.observacoes ?? "",
      responsavelId: initial ? String(initial.responsavelId) : "",
      empreendimentoId: initial?.empreendimentoId ? String(initial.empreendimentoId) : "",
      processoId: initial?.processoId ? String(initial.processoId) : url.processoId,
      condicionanteId: initial?.condicionanteId ? String(initial.condicionanteId) : url.condicionanteId,
      prazoFinal: toDateInput(initial?.prazoFinal),
      alertaPrazoFinal: String(initial?.alertaPrazoFinal ?? 30),
      dataLimite: toDateInput(initial?.dataLimite),
      alertaDataLimite: String(initial?.alertaDataLimite ?? 30),
      dataConclusao: toDateInput(initial?.dataConclusao),
      prioridade: initial?.prioridade ?? "media",
      status: initial?.status ?? "nao_iniciado",
    };
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/responsaveis").then((r) => r.json()),
      fetch("/api/empreendimentos").then((r) => r.json()),
      fetch("/api/processos").then((r) => r.json()),
    ])
      .then(([resp, emp, proc]) => {
        setResponsaveis(Array.isArray(resp) ? resp : []);
        setEmpreendimentos(Array.isArray(emp) ? emp : []);
        setProcessos(
          (Array.isArray(proc) ? proc : []).map(
            (p: {
              id: number;
              numProtocolo: string;
              numLicenca: string | null;
              empreendimentoId: number;
              empreendimento: { id: number; apelido: string } | null;
            }) => ({
              id: p.id,
              numProtocolo: p.numProtocolo,
              numLicenca: p.numLicenca,
              empreendimentoId: p.empreendimentoId,
              empreendimento: p.empreendimento,
            })
          )
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.processoId) return;
    let cancelado = false;
    fetch(`/api/processos/${form.processoId}/condicionantes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (cancelado) return;
        const arr = Array.isArray(d) ? d : [];
        setCondicionantes(arr.map((c: { id: number; titulo: string }) => ({ id: c.id, nome: c.titulo })));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [form.processoId]);

  const processosVisiveis = form.empreendimentoId
    ? processos.filter((p) => p.empreendimentoId === Number(form.empreendimentoId))
    : processos;
  const processoSel = processos.find((p) => p.id === Number(form.processoId));
  const processoNaLista = processosVisiveis.some((p) => p.id === Number(form.processoId));

  async function enviarAnexos(tarefaId: number): Promise<void> {
    if (arquivos.length === 0) return;
    const fd = new FormData();
    for (const f of arquivos) fd.append("arquivo", f);
    const res = await fetch(`/api/tarefas/${tarefaId}/anexos`, { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(`Tarefa criada, mas houve erro nos anexos: ${d.error ?? "falha ao enviar"}`, "warning");
    } else if (d.erros?.length) {
      toast(`Tarefa criada com avisos: ${d.erros.join("; ")}`, "warning");
    } else {
      toast(`${d.anexos?.length ?? arquivos.length} anexo(s) enviado(s)`, "success");
    }
    setArquivos([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      observacoes: form.observacoes,
      responsavelId: Number(form.responsavelId),
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
      processoId: form.processoId ? Number(form.processoId) : null,
      condicionanteId: form.condicionanteId ? Number(form.condicionanteId) : null,
      prazoFinal: form.prazoFinal || null,
      alertaPrazoFinal: Number(form.alertaPrazoFinal) || 0,
      dataLimite: form.dataLimite || null,
      alertaDataLimite: Number(form.alertaDataLimite) || 0,
      dataConclusao: form.status === "concluida" ? form.dataConclusao || null : null,
      prioridade: form.prioridade,
      status: form.status,
    };
    const res = await fetch(endpoint, {
      method: modo === "editar" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast(d.error ?? "Erro ao salvar tarefa", "error");
      return;
    }

    if (modo === "novo" && arquivos.length > 0 && d.id) {
      await enviarAnexos(Number(d.id));
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
          <select
            value={form.empreendimentoId}
            onChange={(e) => setForm({ ...form, empreendimentoId: e.target.value, processoId: "", condicionanteId: "" })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {empreendimentos.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.apelido}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className={labelClass}>Licença</label>
          <select
            value={processoNaLista || !form.processoId ? form.processoId : ""}
            onChange={(e) => setForm({ ...form, processoId: e.target.value, condicionanteId: "" })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {!processoNaLista && processoSel && (
              <option value={processoSel.id}>{rotuloProcesso(processoSel)}</option>
            )}
            {processosVisiveis.map((p) => (
              <option key={p.id} value={p.id}>{rotuloProcesso(p)}</option>
            ))}
          </select>
        </div>
        {form.processoId && (
          <div>
            <label className={labelClass}>Condicionante</label>
            <select value={form.condicionanteId} onChange={(e) => setForm({ ...form, condicionanteId: e.target.value })} className={inputClass}>
              <option value="">Selecione...</option>
              {condicionantes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}
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
      <div className="grid grid-cols-3 gap-4">
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
        {form.status === "concluida" && (
          <div>
            <label className={labelClass}>Data de conclusão</label>
            <input type="date" value={form.dataConclusao} onChange={(e) => setForm({ ...form, dataConclusao: e.target.value })} className={inputClass} />
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>Observações</label>
        <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className={inputClass} />
      </div>

      {modo === "novo" && (
        <div>
          <label className={labelClass}>Anexos</label>
          <label className="focus-ring transition-brand inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
            <Paperclip size={14} />
            {arquivos.length > 0 ? `${arquivos.length} arquivo(s) selecionado(s)` : "Selecionar arquivos"}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setArquivos(e.target.files ? Array.from(e.target.files) : [])}
            />
          </label>
          {arquivos.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-ink-500)]">
              {arquivos.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
