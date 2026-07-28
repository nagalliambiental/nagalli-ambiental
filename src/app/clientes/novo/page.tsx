"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Search, Loader2 } from "lucide-react";
import { maskCnpj } from "@/lib/cnpj-utils";

export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    apelido: "",
    razaoSocial: "",
    cnpj: "",
    telefone: "",
    email: "",
    respLegal: "",
  });
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function buscarCnpj() {
    const cnpjLimpo = form.cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/cnpj/${cnpjLimpo}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao buscar CNPJ");
        return;
      }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        razaoSocial: data.razaoSocial || prev.razaoSocial,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));
    } catch {
      alert("Erro ao consultar CNPJ");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    router.push("/clientes");
    router.refresh();
  }

  return (
    <div>
      <Topbar title="Novo Cliente" subtitle="Cadastre um novo cliente no sistema" />

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Apelido</label>
              <input value={form.apelido} onChange={(e) => setField("apelido", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Razão Social</label>
              <input value={form.razaoSocial} onChange={(e) => setField("razaoSocial", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CNPJ</label>
              <div className="flex gap-2">
                <input
                  value={maskCnpj(form.cnpj)}
                  onChange={(e) => setField("cnpj", e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  required
                />
                <button
                  type="button"
                  onClick={buscarCnpj}
                  disabled={searching || form.cnpj.replace(/\D/g, "").length !== 14}
                  className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-river-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-river-600)] disabled:opacity-50"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Buscar
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Telefone</label>
              <input value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Responsável Legal</label>
              <input value={form.respLegal} onChange={(e) => setField("respLegal", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
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
      </div>
    </div>
  );
}
