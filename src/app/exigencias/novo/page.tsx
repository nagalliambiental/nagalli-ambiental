"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

interface Processo {
  id: number;
  numProtocolo: string;
  tipo: string;
  empreendimento: { apelido: string };
}

export default function NovaExigenciaPage() {
  const router = useRouter();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [form, setForm] = useState({
    descricao: "",
    prazo: "",
    antecedenciaDias: "7",
    processoId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/processos")
      .then((r) => r.json())
      .then((data: Processo[]) => setProcessos(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/exigencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: form.descricao,
        prazo: new Date(form.prazo).toISOString(),
        antecedenciaDias: Number(form.antecedenciaDias),
        processoId: Number(form.processoId),
      }),
    });
    router.push("/exigencias");
    router.refresh();
  }

  return (
    <div>
      <Topbar title="Nova Exigência" subtitle="Registre uma nova exigência" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Prazo</label>
              <input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Antecedência (dias)</label>
              <input type="number" value={form.antecedenciaDias} onChange={(e) => setForm({ ...form, antecedenciaDias: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Processo</label>
            <select value={form.processoId} onChange={(e) => setForm({ ...form, processoId: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
              <option value="">Selecione...</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.numProtocolo} — {p.tipo} ({p.empreendimento.apelido})</option>)}
            </select>
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
      </div>
    </div>
  );
}
