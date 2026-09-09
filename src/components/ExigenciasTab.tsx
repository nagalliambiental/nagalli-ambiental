"use client";

import { useEffect, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Check, CheckCircle2, Trash2, AlertTriangle, Clock, CalendarDays, BellRing } from "lucide-react";
import { useToast } from "@/components/Toast";

interface Exigencia {
  id: number;
  descricao: string;
  prazo: string;
  antecedenciaDias: number;
  cumprida: boolean;
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
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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