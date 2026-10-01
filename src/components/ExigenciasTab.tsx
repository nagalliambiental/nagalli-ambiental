"use client";

import { useEffect, useRef, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Check, CheckCircle2, Trash2, AlertTriangle, Clock, CalendarDays, BellRing, Paperclip, Download, Eye, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface DocumentoExigencia {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  criadoEm: string;
}

interface Exigencia {
  id: number;
  descricao: string;
  prazo: string;
  antecedenciaDias: number;
  cumprida: boolean;
  documentos?: DocumentoExigencia[];
}

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-sm font-medium text-[var(--color-ink-700)] mb-1";

export default function ExigenciasTab({ processoId }: { processoId: number }) {
  const { toast } = useToast();
  const [exigencias, setExigencias] = useState<Exigencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ descricao: "", prazo: "", antecedenciaDias: "7" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  function formatarTamanho(bytes: number) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function pickDocumento(exigenciaId: number) {
    setUploadTarget(exigenciaId);
    fileRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploadTarget === null) return;
    const exigenciaId = uploadTarget;
    setUploadingId(exigenciaId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("exigenciaId", String(exigenciaId));
      fd.append("tipo", "anexo");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Erro ao fazer upload do documento", "error");
        return;
      }
      toast(`Documento "${file.name}" anexado à exigência`, "success");
      load();
    } catch {
      toast("Erro ao fazer upload do documento", "error");
    } finally {
      setUploadingId(null);
      setUploadTarget(null);
    }
  }

  function verDocumento(d: DocumentoExigencia) {
    window.open(`/api/documentos/${d.id}/download?inline=1`, "_blank");
  }

  function baixarDocumento(d: DocumentoExigencia) {
    const a = document.createElement("a");
    a.href = `/api/documentos/${d.id}/download`;
    a.download = d.nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function excluirDocumento(d: DocumentoExigencia) {
    if (!confirm(`Excluir o documento "${d.nome}"?`)) return;
    const res = await fetch(`/api/documentos/${d.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Documento excluído", "success");
      load();
    } else {
      toast("Erro ao excluir o documento", "error");
    }
  }

  async function load() {
    const res = await fetch(`/api/exigencias?processoId=${processoId}`);
    if (res.ok) {
      const data = await res.json();
      setExigencias(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/exigencias?processoId=${processoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setExigencias(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [processoId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/exigencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        processoId,
        descricao: form.descricao,
        prazo: form.prazo || null,
        antecedenciaDias: Number(form.antecedenciaDias) || 7,
        cumprida: false,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Erro ao criar exigência", "error");
      return;
    }
    toast("Exigência vinculada à licença", "success");
    setForm({ descricao: "", prazo: "", antecedenciaDias: "7" });
    load();
  }

  async function toggleCumprida(e: Exigencia) {
    const res = await fetch(`/api/exigencias/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cumprida: !e.cumprida }),
    });
    if (res.ok) {
      toast(e.cumprida ? "Exigência reaberta" : "Exigência cumprida", "success");
      load();
    } else {
      toast("Erro ao atualizar", "error");
    }
  }

  async function excluir(e: Exigencia) {
    if (!confirm("Excluir esta exigência?")) return;
    const res = await fetch(`/api/exigencias/${e.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Exigência excluída", "success");
      load();
    } else {
      toast("Erro ao excluir", "error");
    }
  }

  const agora = new Date();
  const cumpridas = exigencias.filter((x) => x.cumprida).length;
  const vencidas = exigencias.filter((x) => !x.cumprida && new Date(x.prazo) < agora).length;

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" className="hidden" onChange={onFileSelected} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4 text-sm">
          <p className="text-[var(--color-ink-500)]">Total</p>
          <p className="font-display text-xl font-semibold text-[var(--color-ink-900)]">{exigencias.length}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4 text-sm">
          <p className="text-[var(--color-ink-500)]">Cumpridas</p>
          <p className="font-display text-xl font-semibold text-[var(--color-brand-600)]">{cumpridas}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4 text-sm">
          <p className="text-[var(--color-ink-500)]">Pendentes</p>
          <p className="font-display text-xl font-semibold text-[var(--color-ink-900)]">{exigencias.length - cumpridas}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4 text-sm">
          <p className="text-[var(--color-ink-500)]">Vencidas</p>
          <p className={`font-display text-xl font-semibold ${vencidas > 0 ? "text-[var(--color-river-700)]" : "text-[var(--color-ink-900)]"}`}>{vencidas}</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] flex items-center gap-2">
          <Plus size={16} />
          Nova exigência
        </h2>
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea
            rows={2}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className={inputClass}
            placeholder="Descreva a exigência vinculada a esta licença"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Prazo</label>
            <input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Alerta (dias antes)</label>
            <input type="number" min={0} value={form.antecedenciaDias} onChange={(e) => setForm({ ...form, antecedenciaDias: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
            {saving ? "Vinculando..." : "Vincular exigência"}
          </button>
        </div>
      </form>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Exigências da licença</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-ink-500)]">Carregando...</p>
        ) : exigencias.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">Nenhuma exigência vinculada a esta licença.</p>
        ) : (
          <div className="space-y-2">
            {exigencias.map((e) => {
              const prazo = new Date(e.prazo);
              const diasRestantes = differenceInDays(prazo, agora);
              const isVencido = diasRestantes < 0;
              const isUrgente = !isVencido && diasRestantes <= e.antecedenciaDias;
              return (
                <div key={e.id} className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${e.cumprida ? "border-[var(--color-paper-200)] bg-[var(--color-paper-50)] opacity-70" : isVencido ? "border-red-300 bg-red-50" : isUrgente ? "border-amber-200 bg-amber-50" : "border-[var(--color-paper-200)] bg-white"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-ink-900)] whitespace-pre-wrap">{e.descricao}</p>
                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--color-ink-500)]">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {format(prazo, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <BellRing size={12} />
                        Alerta {e.antecedenciaDias} dias antes
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${isVencido ? "text-red-700" : isUrgente ? "text-amber-700" : ""}`}>
                        {e.cumprida ? (
                          <><Check size={12} /> Cumprida</>
                        ) : isVencido ? (
                          <><AlertTriangle size={12} /> Vencida há {Math.abs(diasRestantes)} dia(s)</>
                        ) : (
                          <><Clock size={12} /> {diasRestantes} dia(s) restante(s)</>
                        )}
                      </span>
                    </div>
                    {(e.documentos?.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-1 border-t border-dashed border-[var(--color-paper-200)] pt-2">
                        {e.documentos!.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 rounded-md bg-[var(--color-paper-50)] px-2 py-1.5">
                            <span className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-ink-700)]">
                              <FileText size={13} className="shrink-0 text-[var(--color-brand-600)]" />
                              <span className="truncate" title={d.nome}>{d.nome}</span>
                              <span className="shrink-0 text-[var(--color-ink-400)]">({formatarTamanho(d.tamanho)})</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <button type="button" onClick={() => verDocumento(d)} title="Visualizar" className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-paper-200)] bg-white text-[var(--color-ink-500)] hover:text-[var(--color-brand-600)]">
                                <Eye size={13} />
                              </button>
                              <button type="button" onClick={() => baixarDocumento(d)} title="Baixar" className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-paper-200)] bg-white text-[var(--color-ink-500)] hover:text-[var(--color-brand-600)]">
                                <Download size={13} />
                              </button>
                              <button type="button" onClick={() => excluirDocumento(d)} title="Excluir documento" className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-paper-200)] bg-white text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600">
                                <Trash2 size={13} />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => pickDocumento(e.id)} title="Anexar documento" disabled={uploadingId === e.id} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-paper-200)] bg-white text-[var(--color-ink-500)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)] disabled:opacity-50" type="button">
                      {uploadingId === e.id ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                    <button onClick={() => toggleCumprida(e)} title={e.cumprida ? "Reabrir" : "Marcar como cumprida"} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-paper-200)] bg-white text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]" type="button">
                      <CheckCircle2 size={16} />
                    </button>
                    <button onClick={() => excluir(e)} title="Excluir" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-paper-200)] bg-white text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" type="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}