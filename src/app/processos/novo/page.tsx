"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

const TIPOS = [
  "Licença Prévia",
  "Licença de Instalação",
  "Licença de Operação",
  "Autorização Ambiental para Corte",
  "Autorização Ambiental para Obra",
  "Outorga de Direito de Uso",
  "Dispensa de Licença",
  "Dispensa de Outorga",
  "AEO",
  "PGRCC",
  "RGRCC",
];

const SISTEMAS = ["SGA", "E-Protocolo", "SIMA"];

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
  const [tipo, setTipo] = useState("");
  const [tipoOutro, setTipoOutro] = useState("");
  const [sistema, setSistema] = useState("");
  const [sistemaOutro, setSistemaOutro] = useState("");
  const [form, setForm] = useState({
    orgaoId: "",
    numProtocolo: "",
    empreendimentoId: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orgaos")
      .then((r) => r.json())
      .then(setOrgaos)
      .catch(() => {});
    fetch("/api/empreendimentos")
      .then((r) => r.json())
      .then(setEmpreendimentos)
      .catch(() => {});
  }, []);

  function getTipoFinal() {
    return tipo === "Outros" ? tipoOutro : tipo;
  }

  function getSistemaFinal() {
    return sistema === "Outro" ? sistemaOutro : sistema;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: getTipoFinal(),
        orgaoId: Number(form.orgaoId),
        sistema: getSistemaFinal(),
        numProtocolo: form.numProtocolo,
        empreendimentoId: Number(form.empreendimentoId),
        observacoes: form.observacoes,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao criar processo");
      setSaving(false);
      return;
    }

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
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="">Selecione...</option>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="Outros">Outros</option>
              </select>
              {tipo === "Outros" && (
                <input value={tipoOutro} onChange={(e) => setTipoOutro(e.target.value)} placeholder="Especifique o tipo" className="mt-2 w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
              )}
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
              <select value={sistema} onChange={(e) => setSistema(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="">Selecione...</option>
                {SISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="Outro">Outro</option>
              </select>
              {sistema === "Outro" && (
                <input value={sistemaOutro} onChange={(e) => setSistemaOutro(e.target.value)} placeholder="Especifique o sistema" className="mt-2 w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
              )}
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
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
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
