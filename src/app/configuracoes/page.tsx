"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Building2, Loader2, Save } from "lucide-react";

export default function ConfiguracoesPage() {
  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    rua: "",
    numero: "",
    bairro: "",
    complemento: "",
    cep: "",
    municipio: "",
    uf: "",
    telefone: "",
    email: "",
    website: "",
    logo: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/empresa")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setForm((prev) => ({ ...prev, ...data }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function formatCNPJ(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function setField(field: string, value: string) {
    const masked = field === "cnpj" ? formatCNPJ(value) : value;
    setForm((prev) => ({ ...prev, [field]: masked }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setMsg("Erro ao salvar"); return; }
    setMsg("Configurações salvas com sucesso!");
  }

  if (!loaded) return null;

  return (
    <div>
      <Topbar title="Configurações" subtitle="Dados da empresa" />

      <div className="mx-auto max-w-3xl">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={20} className="text-[var(--color-brand-500)]" />
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Dados da Empresa</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Razão Social</label>
              <input value={form.razaoSocial} onChange={(e) => setField("razaoSocial", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome Fantasia</label>
              <input value={form.nomeFantasia} onChange={(e) => setField("nomeFantasia", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CNPJ</label>
              <input value={form.cnpj} onChange={(e) => setField("cnpj", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Telefone</label>
              <input value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Website</label>
              <input value={form.website} onChange={(e) => setField("website", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>

          <div className="border-t border-[var(--color-paper-200)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink-900)] mb-3">Endereço</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Rua</label>
                <input value={form.rua} onChange={(e) => setField("rua", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Número</label>
                <input value={form.numero} onChange={(e) => setField("numero", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Bairro</label>
                <input value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Complemento</label>
                <input value={form.complemento} onChange={(e) => setField("complemento", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CEP</label>
                <input value={form.cep} onChange={(e) => setField("cep", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Município</label>
                <input value={form.municipio} onChange={(e) => setField("municipio", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">UF</label>
                <input value={form.uf} onChange={(e) => setField("uf", e.target.value)} maxLength={2} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-paper-200)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink-900)] mb-3">Logo</h3>
            <p className="text-xs text-[var(--color-ink-500)] mb-2">URL da imagem da logo (ex: /Logo.jpeg)</p>
            <div className="flex items-center gap-3">
              <input value={form.logo} onChange={(e) => setField("logo", e.target.value)} placeholder="/Logo.jpeg" className="flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              {form.logo && <img src={form.logo} alt="logo" className="h-10 w-10 rounded object-contain border" />}
            </div>
          </div>

          {msg && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${msg.includes("sucesso") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {msg}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}