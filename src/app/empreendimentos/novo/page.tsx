"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

interface Cliente {
  id: number;
  apelido: string;
}

export default function NovoEmpreendimentoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({
    apelido: "",
    endereco: "",
    descricao: "",
    clienteId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then(setClientes)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/empreendimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clienteId: Number(form.clienteId) }),
    });
    router.push("/empreendimentos");
    router.refresh();
  }

  return (
    <div>
      <Topbar title="Novo Empreendimento" subtitle="Cadastre um novo empreendimento" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Apelido</label>
              <input value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Cliente</label>
              <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="">Selecione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.apelido}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Endereço</label>
            <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
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
