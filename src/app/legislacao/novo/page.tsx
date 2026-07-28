"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

export default function NovaLegislacaoPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    tipo: "lei",
    numero: "",
    data: "",
    url: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/legislacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        data: form.data ? new Date(form.data).toISOString() : undefined,
      }),
    });
    router.push("/legislacao");
    router.refresh();
  }

  return (
    <div>
      <Topbar title="Nova Legislação" subtitle="Cadastre uma nova legislação" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                <option value="lei">Lei</option>
                <option value="decreto">Decreto</option>
                <option value="norma">Norma</option>
                <option value="resolucao">Resolução</option>
                <option value="portaria">Portaria</option>
                <option value="instrucao_normativa">Instrução Normativa</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Número</label>
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Data</label>
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">URL (opcional)</label>
            <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
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
