"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

interface Orgao {
  id: number;
  sigla: string;
}

interface Empreendimento {
  id: number;
  apelido: string;
}

export default function NovoProcessoPage() {
  const router = useRouter();
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [form, setForm] = useState({
    tipo: "",
    orgaoId: "",
    sistema: "",
    numProtocolo: "",
    empreendimentoId: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/processos")
      .then((r) => r.json())
      .then((data: { orgao: Orgao }[]) => {
        const uniqueOrgaos = Array.from(new Map(data.map((p) => [p.orgao.id, p.orgao])).values());
        setOrgaos(uniqueOrgaos);
      })
      .catch(() => {});
    fetch("/api/empreendimentos")
      .then((r) => r.json())
      .then(setEmpreendimentos)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        orgaoId: Number(form.orgaoId),
        empreendimentoId: Number(form.empreendimentoId),
      }),
    });
    router.push("/processos");
    router.refresh();
  }

  return (
    <div>
      <Topbar title="Novo Processo" subtitle="Cadastre um novo processo" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Tipo</label>
              <input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Órgão</label>
              <select value={form.orgaoId} onChange={(e) => setForm({ ...form, orgaoId: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="">Selecione...</option>
                {orgaos.map((o) => <option key={o.id} value={o.id}>{o.sigla}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Sistema</label>
              <input value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nº Protocolo</label>
              <input value={form.numProtocolo} onChange={(e) => setForm({ ...form, numProtocolo: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Empreendimento</label>
            <select value={form.empreendimentoId} onChange={(e) => setForm({ ...form, empreendimentoId: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
              <option value="">Selecione...</option>
              {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.apelido}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
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
