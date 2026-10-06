"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/format";
import { Pencil, Trash2, X, CheckCircle2, Repeat } from "lucide-react";
import { ROTULO_RECORRENCIA } from "@/lib/constants";
import { BotaoAnexos, TarefaAnexos } from "@/components/tarefas/TarefaAnexos";
import { SelecaoBusca } from "@/components/SelecaoBusca";

export type LinhaTarefaTarefa = {
  id: number;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  status: string;
  prioridade: string;
  prazoFinal: string | null;
  alertaPrazoFinal: number;
  dataLimite: string | null;
  alertaDataLimite: number;
  dataConclusao: string | null;
  responsavelId: number;
  responsavel: { id: number; nome: string };
  empreendimentoId: number | null;
  empreendimento: { id: number; apelido: string } | null;
  processoId: number | null;
  processo: { id: number; numProtocolo: string; numLicenca: string | null } | null;
  condicionanteId: number | null;
  condicionante: { id: number; titulo: string } | null;
  serie?: { recorrencia: string } | null;
  _count?: { anexos: number };
  criadoEm: string;
};

export type OpcaoIdNome = { id: number; nome: string };
export type OpcaoProcesso = {
  id: number;
  numProtocolo: string;
  numLicenca: string | null;
  empreendimentoId: number;
  empreendimento: { id: number; apelido: string } | null;
};

const STATUS_OPTS = [
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "para_revisao", label: "Para revisão" },
  { value: "concluida", label: "Concluída" },
];

const STATUS_BADGE: Record<string, string> = {
  nao_iniciado: "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]",
  em_andamento: "bg-blue-50 text-blue-700 ring-blue-200",
  para_revisao: "bg-amber-50 text-amber-700 ring-amber-200",
  concluida: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const PRIORIDADE_OPTS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-xs font-medium text-[var(--color-ink-700)] mb-1";

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

export function LinhaTarefa({
  tarefa,
  responsaveis,
  empreendimentos,
  processos,
}: {
  tarefa: LinhaTarefaTarefa;
  responsaveis: OpcaoIdNome[];
  empreendimentos: { id: number; apelido: string }[];
  processos: OpcaoProcesso[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAnexos, setOpenAnexos] = useState(false);
  const [condicionantes, setCondicionantes] = useState<OpcaoIdNome[]>([]);
  const [form, setForm] = useState({
    titulo: tarefa.titulo,
    descricao: tarefa.descricao ?? "",
    observacoes: tarefa.observacoes ?? "",
    prazoFinal: toDateInput(tarefa.prazoFinal),
    alertaPrazoFinal: String(tarefa.alertaPrazoFinal ?? 30),
    dataLimite: toDateInput(tarefa.dataLimite),
    alertaDataLimite: String(tarefa.alertaDataLimite ?? 30),
    prioridade: tarefa.prioridade,
    status: tarefa.status,
    responsavelId: String(tarefa.responsavelId),
    empreendimentoId: tarefa.empreendimentoId ? String(tarefa.empreendimentoId) : "",
    processoId: tarefa.processoId ? String(tarefa.processoId) : "",
    condicionanteId: tarefa.condicionanteId ? String(tarefa.condicionanteId) : "",
    dataConclusao: tarefa.dataConclusao ? tarefa.dataConclusao.slice(0, 16) : "",
  });

  const processosVisiveis = form.empreendimentoId
    ? processos.filter((p) => p.empreendimentoId === Number(form.empreendimentoId))
    : processos;
  const processoSel = processos.find((p) => p.id === Number(form.processoId));
  const processoNaLista = processosVisiveis.some((p) => p.id === Number(form.processoId));

  useEffect(() => {
    if (!form.processoId) return;
    let cancelado = false;
    fetch(`/api/processos/${form.processoId}/condicionantes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (cancelado) return;
        const arr = Array.isArray(d) ? d : d.condicionantes ?? [];
        setCondicionantes(
          arr.map((c: { id: number; titulo: string }) => ({ id: c.id, nome: c.titulo }))
        );
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [form.processoId]);

  async function mudarStatus(v: string) {
    const res = await fetch(`/api/tarefas/${tarefa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: v }),
    });
    if (res.ok) {
      toast(v === "concluida" ? "Tarefa concluída" : "Status atualizado", "success");
      router.refresh();
    } else {
      toast("Erro ao atualizar status", "error");
    }
  }

  async function excluir() {
    if (!confirm(`Excluir a tarefa "${tarefa.titulo}"?`)) return;
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefa.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      toast("Tarefa excluída", "success");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? "Erro ao excluir tarefa", "error");
    }
  }

  async function salvar() {
    if (!form.titulo.trim()) {
      toast("Título é obrigatório", "error");
      return;
    }
    if (!form.responsavelId) {
      toast("Responsável é obrigatório", "error");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/tarefas/${tarefa.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descricao: form.descricao || null,
        observacoes: form.observacoes || null,
        prazoFinal: form.prazoFinal || null,
        alertaPrazoFinal: form.alertaPrazoFinal !== "" ? Number(form.alertaPrazoFinal) : 30,
        dataLimite: form.dataLimite || null,
        alertaDataLimite: form.alertaDataLimite !== "" ? Number(form.alertaDataLimite) : 30,
        prioridade: form.prioridade,
        status: form.status,
        responsavelId: Number(form.responsavelId),
        empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
        processoId: form.processoId ? Number(form.processoId) : null,
        condicionanteId: form.condicionanteId ? Number(form.condicionanteId) : null,
        dataConclusao: form.dataConclusao ? form.dataConclusao.slice(0, 10) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setOpenEdit(false);
      toast("Tarefa salva", "success");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? "Erro ao salvar tarefa", "error");
    }
  }

  const atrasada =
    tarefa.status !== "concluida" && tarefa.prazoFinal && new Date(tarefa.prazoFinal) < new Date();

  return (
    <div className="border-b border-[var(--color-paper-100)] px-5 py-3 last:border-b-0 hover:bg-[var(--color-paper-50)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink-900)]">
            <Link href={`/tarefas/${tarefa.id}`} className="hover:text-[var(--color-brand-600)] hover:underline underline-offset-2">
              {tarefa.titulo}
            </Link>
            <span className="font-normal text-[var(--color-ink-500)]"> — {tarefa.responsavel.nome}</span>
            {tarefa.serie && (
              <span
                className="ml-2 inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-violet-700 ring-1 ring-violet-200"
                title={`Tarefa recorrente ${ROTULO_RECORRENCIA[tarefa.serie.recorrencia as keyof typeof ROTULO_RECORRENCIA] ?? tarefa.serie.recorrencia}`}
              >
                <Repeat size={11} />
                {ROTULO_RECORRENCIA[tarefa.serie.recorrencia as keyof typeof ROTULO_RECORRENCIA] ?? tarefa.serie.recorrencia}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
            {tarefa.dataLimite ? `Limite de execução: ${formatDate(tarefa.dataLimite)}` : ""}
            {tarefa.dataLimite && tarefa.prazoFinal ? " · " : ""}
            {tarefa.prazoFinal ? (
              <span className={atrasada ? "font-medium text-red-600" : ""}>
                Prazo final: {formatDate(tarefa.prazoFinal)}
                {atrasada ? " (atrasada)" : ""}
              </span>
            ) : (
              !tarefa.dataLimite && "—"
            )}
          </p>
          <p className="text-xs text-[var(--color-ink-500)]">
            {tarefa.processo
              ? `Licença: ${tarefa.processo.numLicenca || tarefa.processo.numProtocolo}`
              : tarefa.empreendimento
                ? `Empreendimento: ${tarefa.empreendimento.apelido}`
                : "— sem vínculo —"}
            {tarefa.condicionante ? ` · Condicionante: ${tarefa.condicionante.titulo}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {tarefa.status === "concluida" && tarefa.dataConclusao && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 size={12} />
              Concluída em {formatDate(tarefa.dataConclusao)}
            </span>
          )}
          <span className={`hidden rounded-md px-2 py-1 text-xs font-medium ring-1 sm:inline-block ${STATUS_BADGE[tarefa.status] ?? "bg-[var(--color-paper-100)] text-[var(--color-ink-600)] ring-[var(--color-paper-200)]"}`}>
            {STATUS_OPTS.find((s) => s.value === tarefa.status)?.label ?? tarefa.status}
          </span>
          <select
            value={tarefa.status}
            onChange={(e) => mudarStatus(e.target.value)}
            aria-label="Alterar status da tarefa"
            className="focus-ring rounded-md border border-[var(--color-paper-200)] bg-white px-2 py-1.5 text-xs text-[var(--color-brand-600)]"
          >
            {STATUS_OPTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <BotaoAnexos
            count={tarefa._count?.anexos ?? 0}
            active={openAnexos}
            onClick={() => setOpenAnexos((o) => !o)}
          />
          <button
            type="button"
            onClick={() => setOpenEdit((o) => !o)}
            title="Edição rápida"
            className="focus-ring rounded-md p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]"
          >
            {openEdit ? <X size={16} /> : <Pencil size={16} />}
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={loading}
            title="Excluir"
            className="focus-ring rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {openEdit && (
        <div className="mt-3 rounded-lg border border-[var(--color-brand-100, #dbeafe)] bg-[var(--color-brand-50, #eff6ff)]/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">Edição rápida</span>
            <button type="button" onClick={() => setOpenEdit(false)} className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Título</label>
              <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  {PRIORIDADE_OPTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Responsável</label>
                <select value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))} className={inputClass} required>
                  {responsaveis.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                  {STATUS_OPTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {form.status === "concluida" && (
                <div>
                  <label className={labelClass}>Data de conclusão</label>
                  <input type="date" value={form.dataConclusao.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, dataConclusao: e.target.value }))} className={inputClass} />
                </div>
              )}
              <div>
                <label className={labelClass}>Empreendimento</label>
                <SelecaoBusca
                  valor={form.empreendimentoId}
                  onChange={(v) => setForm((f) => ({ ...f, empreendimentoId: v, processoId: "", condicionanteId: "" }))}
                  opcoes={empreendimentos.map((emp) => ({ value: String(emp.id), label: emp.apelido }))}
                  className={inputClass}
                  placeholder="- sem empreendimento -"
                />
              </div>
              <div>
                <label className={labelClass}>Licença</label>
                <select
                  value={processoNaLista || !form.processoId ? form.processoId : ""}
                  onChange={(e) => setForm((f) => ({ ...f, processoId: e.target.value, condicionanteId: "" }))}
                  className={inputClass}
                >
                  <option value="">— sem licença —</option>
                  {!processoNaLista && processoSel && (
                    <option value={processoSel.id}>{rotuloProcesso(processoSel)}</option>
                  )}
                  {processosVisiveis.map((p) => (
                    <option key={p.id} value={p.id}>{rotuloProcesso(p)}</option>
                  ))}
                </select>
              </div>
              {form.processoId && condicionantes.length > 0 && (
                <div>
                  <label className={labelClass}>Condicionante</label>
                  <select value={form.condicionanteId} onChange={(e) => setForm((f) => ({ ...f, condicionanteId: e.target.value }))} className={inputClass}>
                    <option value="">— sem condicionante —</option>
                    {condicionantes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className={inputClass} />
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpenEdit(false)} className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={loading}
              className="focus-ring transition-brand rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {openAnexos && (
        <div className="mt-3 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">Anexos</span>
            <button type="button" onClick={() => setOpenAnexos(false)} className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]">
              <X size={16} />
            </button>
          </div>
          <TarefaAnexos tarefaId={tarefa.id} />
        </div>
      )}
    </div>
  );
}
