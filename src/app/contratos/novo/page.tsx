"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

interface Empreendimento {
  id: number;
  apelido: string;
  ativo: boolean;
}

export default function NovoContratoPage() {
  const router = useRouter();
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [form, setForm] = useState({
    nomeEmpresa: "",
    empreendimentoId: "",
    servicoProcesso: "",
    dataAssinatura: "",
    dataValidade: "",
    alertaRenovacaoDias: "60",
    visibilidade: "privado",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/empreendimentos")
      .then((r) => r.json())
      .then((data) => setEmpreendimentos(Array.isArray(data) ? data.filter((e) => e.ativo !== false) : []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      nomeEmpresa: form.nomeEmpresa,
      servicoProcesso: form.servicoProcesso,
      dataAssinatura: new Date(form.dataAssinatura).toISOString(),
      dataValidade: new Date(form.dataValidade).toISOString(),
      alertaRenovacaoDias: Number(form.alertaRenovacaoDias),
      visibilidade: form.visibilidade,
      empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
    };

    const res = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao criar contrato");
      setSaving(false);
      return;
    }

    router.push("/contratos");
    router.refresh();
  }

  return (
    <div>
      <Topbar title="Novo Contrato" subtitle="Cadastre um contrato de empresa" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome da empresa <span className="text-red-500">*</span></label>
              <input type="text" value={form.nomeEmpresa} onChange={(e) => setForm({ ...form, nomeEmpresa: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Empreendimento</label>
              <select value={form.empreendimentoId} onChange={(e) => setForm({ ...form, empreendimentoId: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                <option value="">Sem vínculo</option>
                {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.apelido}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Serviço / Processo <span className="text-red-500">*</span></label>
            <textarea value={form.servicoProcesso} onChange={(e) => setForm({ ...form, servicoProcesso: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Data de assinatura <span className="text-red-500">*</span></label>
              <input type="date" value={form.dataAssinatura} onChange={(e) => setForm({ ...form, dataAssinatura: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Data de validade <span className="text-red-500">*</span></label>
              <input type="date" value={form.dataValidade} onChange={(e) => setForm({ ...form, dataValidade: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Alerta de renovação (dias)</label>
              <input type="number" min={0} value={form.alertaRenovacaoDias} onChange={(e) => setForm({ ...form, alertaRenovacaoDias: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              <p className="mt-1 text-xs text-[var(--color-ink-500)]">Padrão: 60 dias antes do vencimento</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Visibilidade</label>
              <select value={form.visibilidade} onChange={(e) => setForm({ ...form, visibilidade: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="privado">Privado (só sócio/admin)</option>
                <option value="publico">Público (todos os usuários)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

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
