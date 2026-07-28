"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Upload, Loader2, FileText, CheckCircle2 } from "lucide-react";

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

interface Responsavel {
  id: number;
  nome: string;
}

export default function NovoProcessoPage() {
  const router = useRouter();
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [tipo, setTipo] = useState("");
  const [tipoOutro, setTipoOutro] = useState("");
  const [sistema, setSistema] = useState("");
  const [sistemaOutro, setSistemaOutro] = useState("");
  const [form, setForm] = useState({
    orgaoId: "",
    numProtocolo: "",
    numLicenca: "",
    validade: "",
    dataProtocolo: "",
    dataContato: "",
    alertaDias: "30",
    condicionantes: "",
    empreendimentoId: "",
    responsavelId: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orgaos")
      .then((r) => r.json())
      .then(setOrgaos)
      .catch(() => {});
    fetch("/api/empreendimentos")
      .then((r) => r.json())
      .then(setEmpreendimentos)
      .catch(() => {});
    fetch("/api/responsaveis")
      .then((r) => r.json())
      .then(setResponsaveis)
      .catch(() => {});
  }, []);

  function getTipoFinal() {
    return tipo === "Outros" ? tipoOutro : tipo;
  }

  function getSistemaFinal() {
    return sistema === "Outro" ? sistemaOutro : sistema;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    setError("");

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/documentos/extract", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao processar documento");
        return;
      }

      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        numProtocolo: data.numProtocolo || prev.numProtocolo,
        numLicenca: data.numLicenca || prev.numLicenca,
        validade: data.validade || prev.validade,
        condicionantes: data.condicionantes || prev.condicionantes,
      }));

      setExtractedFile(file.name);
    } catch {
      setError("Erro ao processar documento");
    } finally {
      setExtracting(false);
    }
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        numLicenca: form.numLicenca || undefined,
        validade: form.validade ? new Date(form.validade).toISOString() : undefined,
        dataProtocolo: form.dataProtocolo ? new Date(form.dataProtocolo).toISOString() : undefined,
        dataContato: form.dataContato ? new Date(form.dataContato).toISOString() : undefined,
        alertaDias: Number(form.alertaDias) || 30,
        condicionantes: form.condicionantes || undefined,
        empreendimentoId: Number(form.empreendimentoId),
        responsavelId: form.responsavelId ? Number(form.responsavelId) : undefined,
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">Dados do processo</h2>
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
                <select value={form.orgaoId} onChange={(e) => setField("orgaoId", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
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
                <input value={form.numProtocolo} onChange={(e) => setField("numProtocolo", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nº Licença</label>
                <input value={form.numLicenca} onChange={(e) => setField("numLicenca", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Validade</label>
                <input type="date" value={form.validade} onChange={(e) => setField("validade", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Data Protocolo</label>
                <input type="date" value={form.dataProtocolo} onChange={(e) => setField("dataProtocolo", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Data Contato</label>
                <input type="date" value={form.dataContato} onChange={(e) => setField("dataContato", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Alerta (dias antes do vencimento)</label>
                <input type="number" min={1} value={form.alertaDias} onChange={(e) => setField("alertaDias", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Responsável Técnico</label>
                <select value={form.responsavelId} onChange={(e) => setField("responsavelId", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                  <option value="">Selecione...</option>
                  {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Condicionantes</label>
              <textarea value={form.condicionantes} onChange={(e) => setField("condicionantes", e.target.value)} rows={4} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">Upload de Licença</h2>
            <p className="text-xs text-[var(--color-ink-500)]">Anexe o documento da licença para preenchimento automático dos campos acima.</p>

            <label className="focus-ring transition-brand flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-paper-200)] px-4 py-6 text-sm text-[var(--color-ink-500)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)]">
              {extracting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processando documento...
                </>
              ) : extractedFile ? (
                <>
                  <CheckCircle2 size={18} className="text-green-600" />
                  <span className="text-green-700">{extractedFile}</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Clique para selecionar o arquivo da licença</span>
                </>
              )}
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" disabled={extracting} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Empreendimento</label>
            <select value={form.empreendimentoId} onChange={(e) => setField("empreendimentoId", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
              <option value="">Selecione...</option>
              {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.apelido}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} rows={3} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
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
