"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const inputClass = "focus-ring w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm text-[var(--color-ink-900)]";

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    telefone: "",
    email: "",
    cep: "",
    enderecoRua: "",
    enderecoNumero: "",
    enderecoComplemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  function set<K extends keyof typeof form>(key: K, v: string) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razaoSocial || !form.cnpj) {
      alert("Razão Social e CNPJ são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao salvar");
        return;
      }
      router.push("/empresas");
      router.refresh();
    } catch {
      alert("Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link href="/empresas" className="focus-ring mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]">
        <ArrowLeft size={14} />
        Todas as empresas
      </Link>
      <Topbar title="Nova empresa" subtitle="Preencha os dados do cliente" />

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Razão Social *</label>
              <input className={inputClass} value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome Fantasia</label>
              <input className={inputClass} value={form.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CNPJ *</label>
              <input className={inputClass} value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Telefone</label>
              <input className={inputClass} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
              <input className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Endereço</label>
              <div className="grid grid-cols-6 gap-2">
                <input className={inputClass + " col-span-1"} placeholder="CEP" value={form.cep} onChange={(e) => set("cep", e.target.value)} />
                <input className={inputClass + " col-span-2"} placeholder="Rua" value={form.enderecoRua} onChange={(e) => set("enderecoRua", e.target.value)} />
                <input className={inputClass + " col-span-1"} placeholder="Nº" value={form.enderecoNumero} onChange={(e) => set("enderecoNumero", e.target.value)} />
                <input className={inputClass + " col-span-2"} placeholder="Complemento" value={form.enderecoComplemento} onChange={(e) => set("enderecoComplemento", e.target.value)} />
                <input className={inputClass + " col-span-2"} placeholder="Bairro" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
                <input className={inputClass + " col-span-2"} placeholder="Cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                <input className={inputClass + " col-span-1"} placeholder="UF" value={form.uf} onChange={(e) => set("uf", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar empresa"}
        </button>
      </form>
    </div>
  );
}
