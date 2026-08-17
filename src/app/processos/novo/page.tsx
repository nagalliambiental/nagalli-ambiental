"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FolderKanban, Upload, Loader2, FileText, CheckCircle2, Search, Leaf } from "lucide-react";

const TIPOS = [
  "Licença Prévia",
  "Licença de Instalação",
  "Licença de Operação",
  "Autorização Ambiental para Corte",
  "Autorização Ambiental para Obra",
  "Outorga Prévia",
  "Outorga de Direito de Uso",
  "Dispensa de Licença",
  "Dispensa de Outorga",
  "AEO",
  "PGRCC",
  "RGRCC",
];

const SISTEMAS = ["SGA", "E-Protocolo", "SIMA"];

const TIPOS_COMPENSACAO = [
  "Reposição florestal",
  "Plantio compensatório",
  "Pagamento indenizatório",
  "Outro",
];

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
  const [buscandoSia, setBuscandoSia] = useState(false);
  const [corte, setCorte] = useState({
    quantidadeIndividuos: "",
    compensacaoExigida: false,
    tipoCompensacao: "",
    quantidadeMudas: "",
    areaCompensacaoM2: "",
    prazoCompensacao: "",
  });

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

  function alertaPadraoPara(tipoAtual: string): string {
    if (tipoAtual.startsWith("Licença") || tipoAtual.startsWith("Renovação de Licença")) return "180";
    if (tipoAtual.includes("Outorga") && !tipoAtual.startsWith("Dispensa")) return "45";
    return "30";
  }

  function ehOutorga(tipoAtual: string): boolean {
    return tipoAtual.includes("Outorga") || tipoAtual.includes("SIGARH");
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

  function toDateInput(value: string): string {
    const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  }

  async function buscarDadosPublicos() {
    const tipoFinal = getTipoFinal();
    const protocolo = form.numProtocolo.replace(/\D/g, "");
    const portaria = form.numLicenca.replace(/\D/g, "");

    if (!protocolo && !portaria) {
      setError("Informe o nº do protocolo (ou da portaria) para buscar");
      return;
    }

    const urls = (ehOutorga: boolean) =>
      ehOutorga
        ? `/api/outorga/consulta?${protocolo ? `protocolo=${protocolo}` : `portaria=${portaria}`}`
        : `/api/sia/consulta?protocolo=${protocolo}`;

    const primarioSigarh = ehOutorga(tipoFinal);
    const ordem: boolean[] = primarioSigarh ? [true, false] : [false, true];

    const preencherOutorga = (d: Record<string, unknown>) => {
      setForm((prev) => ({
        ...prev,
        numProtocolo: String(d.portaria || prev.numProtocolo),
        numLicenca: String(d.portaria || prev.numLicenca),
        validade: toDateInput(String(d.dataVencimento || "").split(" ")[0]) || prev.validade,
        dataProtocolo: toDateInput(String(d.dataPublicacao || "")) || prev.dataProtocolo,
        observacoes: [prev.observacoes, `SIGARH: ${d.usuario}`].filter(Boolean).join("\n"),
      }));
      setExtractedFile(`Dados do SIGARH (${d.tipoDocumento || "outorga"})`);
    };

    const preencherLicenca = (d: Record<string, unknown>) => {
      setForm((prev) => ({
        ...prev,
        numProtocolo: String(d.protocolo || prev.numProtocolo),
        numLicenca: String(d.numLicenca || prev.numLicenca),
        validade: toDateInput(String(d.dataValidade || "")) || prev.validade,
        dataProtocolo: toDateInput(String(d.dataEmissao || "")) || prev.dataProtocolo,
        condicionantes: String(d.condicionantes || prev.condicionantes || ""),
      }));
      setExtractedFile(`Dados do SIA/IAP (${d.modalidade || "licença"})`);
    };

    for (const usarSigarh of ordem) {
      setBuscandoSia(true);
      setError("");
      try {
        const res = await fetch(urls(usarSigarh));
        if (!res.ok) continue;
        const dados = await res.json();
        const d = usarSigarh ? (Array.isArray(dados) ? dados[0] : null) : dados;
        if (!d) continue;
        if (usarSigarh) {
          preencherOutorga(d);
        } else {
          preencherLicenca(d);
        }
        return;
      } catch {
        // tenta o próximo sistema
      }
    }

    setBuscandoSia(false);
    setError(primarioSigarh
      ? "Nenhuma outorga encontrada no SIGARH"
      : "Nenhuma licença encontrada no SIA/IAP");
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
        autorizacaoCorte: getTipoFinal() === "Autorização Ambiental para Corte" ? {
          quantidadeIndividuos: corte.quantidadeIndividuos ? Number(corte.quantidadeIndividuos) : null,
          compensacaoExigida: corte.compensacaoExigida,
          tipoCompensacao: corte.tipoCompensacao || null,
          quantidadeMudas: corte.quantidadeMudas ? Number(corte.quantidadeMudas) : null,
          areaCompensacaoM2: corte.areaCompensacaoM2 ? Number(corte.areaCompensacaoM2) : null,
          prazoCompensacao: corte.prazoCompensacao ? new Date(corte.prazoCompensacao).toISOString() : null,
        } : undefined,
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
      <Topbar icon={FolderKanban} title="Novo Processo" subtitle="Cadastre um novo processo" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">Dados do processo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setField("alertaDias", alertaPadraoPara(e.target.value)); }} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
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
                <div className="flex gap-2">
                  <input value={form.numProtocolo} onChange={(e) => setField("numProtocolo", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
                  <button
                    type="button"
                    onClick={buscarDadosPublicos}
                    disabled={buscandoSia}
                    className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                    title="Buscar dados automaticamente: SIA/IAP para licenças ou SIGARH para outorgas"
                  >
                    {buscandoSia ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
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

          {tipo === "Autorização Ambiental para Corte" && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
              <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)] flex items-center gap-2">
                <Leaf size={16} />
                Compensação Ambiental
              </h2>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Quantidade de indivíduos</label>
                <input type="number" min={0} value={corte.quantidadeIndividuos} onChange={(e) => setCorte((p) => ({ ...p, quantidadeIndividuos: e.target.value }))} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-700)]">
                <input type="checkbox" checked={corte.compensacaoExigida} onChange={(e) => setCorte((p) => ({ ...p, compensacaoExigida: e.target.checked }))} />
                Compensação ambiental exigida
              </label>
              {corte.compensacaoExigida && (
                <div className="space-y-4 border-l-2 border-[var(--color-brand-100)] pl-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Tipo de compensação</label>
                    <select value={corte.tipoCompensacao} onChange={(e) => setCorte((p) => ({ ...p, tipoCompensacao: e.target.value }))} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                      <option value="">Selecione...</option>
                      {TIPOS_COMPENSACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Quantidade de mudas</label>
                      <input type="number" min={0} value={corte.quantidadeMudas} onChange={(e) => setCorte((p) => ({ ...p, quantidadeMudas: e.target.value }))} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Área de compensação (m²)</label>
                      <input type="number" min={0} step="0.01" value={corte.areaCompensacaoM2} onChange={(e) => setCorte((p) => ({ ...p, areaCompensacaoM2: e.target.value }))} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Prazo de compensação</label>
                    <input type="date" value={corte.prazoCompensacao} onChange={(e) => setCorte((p) => ({ ...p, prazoCompensacao: e.target.value }))} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
                    <p className="mt-1 text-xs text-[var(--color-ink-500)]">Gera automaticamente um alerta de prazo em Exigências.</p>
                  </div>
                </div>
              )}
            </div>
          )}
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
