"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, Paperclip, Clock, User, FileText, X, MapPin } from "lucide-react";
import { useToast } from "@/components/Toast";
import Link from "next/link";

interface HistoricoEntry {
  id: number;
  descricao: string;
  anexo: string | null;
  usuarioId: number | null;
  criadoEm: string;
  usuario: { nome: string } | null;
  empreendimento: { apelido: string } | null;
}

interface EmpreendimentoOption {
  id: number;
  apelido: string;
}

interface Props {
  clienteId?: number;
  empreendimentoId?: number;
  empreendimentos?: EmpreendimentoOption[];
}

export function HistoricoTab({ clienteId, empreendimentoId, empreendimentos }: Props) {
  const { toast } = useToast();
  const [historicos, setHistoricos] = useState<HistoricoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [descricao, setDescricao] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchHistoricos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clienteId && empreendimentos) {
        params.set("clienteId", String(clienteId));
        params.set("empreendimentoIds", empreendimentos.map((e) => e.id).join(","));
      } else if (clienteId) {
        params.set("clienteId", String(clienteId));
      } else if (empreendimentoId) {
        params.set("empreendimentoId", String(empreendimentoId));
      }
      const res = await fetch(`/api/historico?${params}`);
      const data = await res.json();
      setHistoricos(data);
    } catch {
      setHistoricos([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId, empreendimentoId, empreendimentos]);

  useEffect(() => { fetchHistoricos(); }, [fetchHistoricos]);

  async function handleAdd() {
    if (!descricao.trim()) { toast("Descreva o ocorrido", "error"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("descricao", descricao.trim());
      if (clienteId) formData.set("clienteId", String(clienteId));
      const empId = Number(selectedEmpId);
      if (empId) formData.set("empreendimentoId", String(empId));
      if (anexo) formData.set("anexo", anexo);

      const res = await fetch("/api/historico", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      setDescricao("");
      setSelectedEmpId("");
      setAnexo(null);
      toast("Histórico adicionado", "success");
      fetchHistoricos();
    } catch {
      toast("Erro ao adicionar histórico", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remover este registro?")) return;
    try {
      await fetch(`/api/historico?id=${id}`, { method: "DELETE" });
      toast("Registro removido", "success");
      fetchHistoricos();
    } catch {
      toast("Erro ao remover", "error");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  return (
    <div className="space-y-6">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Novo Registro</h3>
        <div className="space-y-3">
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o que está ocorrendo..."
            rows={4}
            className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-none"
          />
          {empreendimentos && (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            >
              <option value="">Vincular a um empreendimento (opcional)</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.apelido}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-3">
            <label className="focus-ring transition-brand flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              <Paperclip size={14} />
              {anexo ? anexo.name : "Anexar arquivo"}
              <input type="file" className="hidden" onChange={(e) => setAnexo(e.target.files?.[0] || null)} />
            </label>
            {anexo && (
              <button type="button" onClick={() => setAnexo(null)} className="text-[var(--color-ink-400)] hover:text-red-500">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !descricao.trim()}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[var(--color-brand-500)]" /></div>
      ) : historicos.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)] text-center py-8">Nenhum registro de histórico.</p>
      ) : (
        <div className="space-y-3">
          {historicos.map((h) => (
            <div key={h.id} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-ink-900)] whitespace-pre-wrap">{h.descricao}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-ink-400)]">
                    <span className="flex items-center gap-1"><Clock size={12} />{formatDate(h.criadoEm)}</span>
                    {h.usuario && <span className="flex items-center gap-1"><User size={12} />{h.usuario.nome}</span>}
                    {h.empreendimento && (
                      <span className="flex items-center gap-1"><MapPin size={12} />{h.empreendimento.apelido}</span>
                    )}
                    {h.anexo && (
                      <Link href={h.anexo} target="_blank" className="flex items-center gap-1 text-[var(--color-brand-600)] hover:underline">
                        <FileText size={12} />Anexo
                      </Link>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => handleDelete(h.id)} className="shrink-0 text-[var(--color-ink-300)] hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
