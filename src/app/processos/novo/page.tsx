"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FolderKanban, Upload, Loader2, CheckCircle2, Search, Leaf } from "lucide-react";

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

const SISTEMAS = ["SGA", "E-Protocolo", "SIMA", "IMA"];
const ORGAOS_MUNICIPAIS = ["SMMA", "SMA", "SEMAM", "SMAM", "SEMMA"];

const STATUSES = [
  { value: "protocolado", label: "Protocolado" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "exigencia_recebida", label: "Exigência Recebida" },
  { value: "deferido", label: "Deferido" },
  { value: "indeferido", label: "Indeferido" },
  { value: "arquivado", label: "Arquivado" },
  { value: "vencido", label: "Vencido" },
];

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
  const [orgaoOutro, setOrgaoOutro] = useState("");
  const [form, setForm] = useState({
    orgaoId: "",
    numProtocolo: "",
    numLicenca: "",
    atividade: "",
    municipio: "",
    validade: "",
    dataProtocolo: "",
    dataContato: "",
    alertaDias: "30",
    condicionantes: "",
    dadosEmpreendimento: "",
    empreendimentoId: "",
    responsavelId: "",
    observacoes: "",
    status: "protocolado",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [buscandoSia, setBuscandoSia] = useState(false);
  const consultasFeitas = useRef(new Set<string>());
  const importacaoViaUpload = useRef(false);
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

  function orgaoMunicipal() {
    const sigla = orgaos.find((o) => o.id === Number(form.orgaoId))?.sigla || "";
    return ORGAOS_MUNICIPAIS.includes(sigla);
  }

  function alertaPadraoPara(tipoAtual: string): string {
    if (tipoAtual.startsWith("Licença") || tipoAtual.startsWith("Renovação de Licença")) return "180";
    if (tipoAtual.includes("Outorga") && !tipoAtual.startsWith("Dispensa")) return "45";
    return "30";
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    setError("");
    setUploadError(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/documentos/extract", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || "Erro ao processar documento");
        return;
      }

      const data = await res.json();
      importacaoViaUpload.current = true;

      let orgaoIdImportado: string | undefined;
      if (data.orgaoSigla) {
        const orgao = orgaos.find((o) => o.sigla.toUpperCase() === String(data.orgaoSigla).toUpperCase());
        if (orgao) orgaoIdImportado = String(orgao.id);
        else {
          orgaoIdImportado = "outro";
          setOrgaoOutro(String(data.orgaoSigla));
        }
      }

      setForm((prev) => {
        const next = {
          ...prev,
          numLicenca: data.numLicenca || prev.numLicenca,
          numProtocolo: data.numProtocolo || prev.numProtocolo,
          validade: data.validade || prev.validade,
          dataProtocolo: data.dataProtocolo || prev.dataProtocolo,
          condicionantes: data.condicionantes || prev.condicionantes,
          dadosEmpreendimento: data.dadosEmpreendimento || prev.dadosEmpreendimento,
        };
        if (data.municipio) next.municipio = data.municipio;
        if (orgaoIdImportado !== undefined) next.orgaoId = orgaoIdImportado;
        if (data.razaoSocial && !prev.observacoes.includes(String(data.razaoSocial))) {
          next.observacoes = [prev.observacoes, `Documento: ${data.razaoSocial}`].filter(Boolean).join("\n");
        }
        return next;
      });

      if (data.modalidade) {
        const tipoMatch = matchModalidade(String(data.modalidade));
        if (tipoMatch) {
          setTipo(tipoMatch);
          setTipoOutro("");
          setForm((prev) => ({ ...prev, alertaDias: alertaPadraoPara(tipoMatch) }));
        } else {
          setTipo("Outros");
          setTipoOutro(String(data.modalidade));
        }
      }

      if (data.sistema) {
        if (SISTEMAS.includes(String(data.sistema))) {
          setSistema(String(data.sistema));
          setSistemaOutro("");
        } else {
          setSistema("Outro");
          setSistemaOutro(String(data.sistema));
        }
      }

      const campos = [data.numLicenca, data.numProtocolo, data.validade, data.dataProtocolo, data.condicionantes, data.dadosEmpreendimento, data.orgaoSigla, data.municipio, data.modalidade].filter(Boolean);
      setExtractedFile(campos.length > 0 ? `${file.name} — ${campos.length} campo(s) extraído(s) do documento` : `${file.name} — nenhum campo identificado`);
    } catch {
      setUploadError("Erro ao processar documento");
    } finally {
      setExtracting(false);
    }
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toDateInput(value: string): string {
    const m = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  }

  function normalizar(texto: string) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function matchModalidade(modalidade: string): string {
    const n = normalizar(modalidade);
    if (!n) return "";
    const exato = TIPOS.find((t) => normalizar(t) === n);
    if (exato) return exato;
    return TIPOS.find((t) => n.includes(normalizar(t)) || normalizar(t).includes(n)) || "";
  }

  function validadeVencida(validade: string): boolean {
    const iso = toDateInput(validade);
    if (!iso) return false;
    return new Date(`${iso}T12:00:00`) < new Date();
  }

  function aplicarImportacao(d: {
    origem: string;
    orgaoSigla: string;
    sistema: string;
    modalidade: string;
    validade: string;
    atividade: string;
    municipio: string;
    uf: string;
    protocolo: string;
    licenca: string;
    emissao: string;
    condicionantes: string;
    razaoSocial: string;
  }) {
    const tipoMatch = matchModalidade(d.modalidade);
    if (tipoMatch) {
      setTipo(tipoMatch);
      setTipoOutro("");
      setForm((prev) => ({ ...prev, alertaDias: alertaPadraoPara(tipoMatch) }));
    } else if (d.modalidade) {
      setTipo("Outros");
      setTipoOutro(d.modalidade);
    }

    if (SISTEMAS.includes(d.sistema)) {
      setSistema(d.sistema);
      setSistemaOutro("");
    } else if (d.sistema) {
      setSistema("Outro");
      setSistemaOutro(d.sistema);
    }

    const orgao = orgaos.find((o) => o.sigla.toUpperCase() === d.orgaoSigla.toUpperCase());
    const municipio = d.municipio
      ? (d.uf && !d.municipio.includes("/") ? `${d.municipio}/${d.uf}` : d.municipio)
      : "";
    let orgaoIdFinal = orgao ? String(orgao.id) : form.orgaoId;
    if (!orgao && d.orgaoSigla) {
      orgaoIdFinal = "outro";
      setOrgaoOutro(d.orgaoSigla);
    }

    consultasFeitas.current.add(d.licenca.trim());
    consultasFeitas.current.add(form.numLicenca.trim());

    setForm((prev) => ({
      ...prev,
      orgaoId: orgaoIdFinal,
      numProtocolo: d.protocolo || prev.numProtocolo || d.licenca,
      numLicenca: d.licenca || prev.numLicenca,
      validade: toDateInput(d.validade) || prev.validade,
      dataProtocolo: toDateInput(d.emissao) || prev.dataProtocolo,
      atividade: d.atividade || prev.atividade,
      municipio: municipio || prev.municipio,
      condicionantes: d.condicionantes || prev.condicionantes,
      status: validadeVencida(d.validade) ? "vencido" : "deferido",
        observacoes: d.razaoSocial && !prev.observacoes.includes(d.razaoSocial)
          ? [prev.observacoes, `${d.origem}: ${d.modalidade || "licença"} — ${d.razaoSocial}`].filter(Boolean).join("\n")
          : prev.observacoes,
    }));
    setExtractedFile(`Dados importados do ${d.origem} (${d.modalidade || "licença"})`);
    setError("");
  }

  async function consultarLicenca(opts: { licenca?: string; protocolo?: string; silencioso?: boolean }) {
    const licenca = (opts.licenca || "").trim();
    const protocolo = (opts.protocolo || "").trim();
    if (!licenca && !protocolo) {
      if (!opts.silencioso) setError("Informe o nº da licença (ou do protocolo) para buscar");
      return;
    }

    const orgaoParaBusca = orgaos.find((o) => o.id === Number(form.orgaoId));
    const siglaOrgao = orgaoParaBusca?.sigla.toUpperCase() || "";
    if (/^(SMMA|SMA|SEMAM|SMAM|SEMMA)/.test(siglaOrgao)) {
      if (!opts.silencioso) setError("Órgãos municipais não possuem consulta automática — faça a importação pelo upload do documento (PDF)");
      return;
    }

    const chave = licenca || protocolo;
    if (opts.silencioso && consultasFeitas.current.has(chave)) return;

    const orgaoSelecionado = orgaos.find((o) => o.id === Number(form.orgaoId));
    const qs = new URLSearchParams();
    if (licenca) qs.set("licenca", licenca);
    if (protocolo) qs.set("protocolo", protocolo);
    if (orgaoSelecionado?.sigla) qs.set("orgao", orgaoSelecionado.sigla);

    setBuscandoSia(true);
    if (!opts.silencioso) setError("");
    try {
      const res = await fetch(`/api/licencas/consulta?${qs.toString()}`);
      if (res.ok) {
        const d = await res.json();
        consultasFeitas.current.add(chave);
        if (d.licenca) consultasFeitas.current.add(String(d.licenca).trim());
        aplicarImportacao(d);
        return;
      }
      if (!opts.silencioso) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Nenhuma licença encontrada no órgão");
      }
    } catch {
      if (!opts.silencioso) setError("Falha ao consultar o órgão");
    } finally {
      setBuscandoSia(false);
    }
  }

  useEffect(() => {
    const num = form.numLicenca.trim();
    if (num.length < 4) return;
    const t = setTimeout(() => {
      if (importacaoViaUpload.current) {
        importacaoViaUpload.current = false;
        return;
      }
      void consultarLicenca({ licenca: num, silencioso: true });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.numLicenca]);

  async function buscarDadosPublicos() {
    await consultarLicenca({
      licenca: form.numLicenca,
      protocolo: form.numProtocolo,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (form.orgaoId === "outro" && !orgaoOutro.trim()) {
      setError("Informe o nome/sigla do órgão selecionado em Outro");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: getTipoFinal(),
        orgaoId: form.orgaoId === "outro" ? undefined : Number(form.orgaoId),
        orgaoOutro: form.orgaoId === "outro" ? orgaoOutro.trim() : undefined,
        sistema: getSistemaFinal(),
        status: form.status || "protocolado",
        numProtocolo: form.numProtocolo,
        numLicenca: form.numLicenca || undefined,
        atividade: form.atividade || undefined,
        municipio: form.municipio || undefined,
        validade: form.validade ? new Date(form.validade).toISOString() : undefined,
        dataProtocolo: form.dataProtocolo ? new Date(form.dataProtocolo).toISOString() : undefined,
        dataContato: form.dataContato ? new Date(form.dataContato).toISOString() : undefined,
        alertaDias: Number(form.alertaDias) || 30,
        condicionantes: form.condicionantes || undefined,
        dadosEmpreendimento: form.dadosEmpreendimento || undefined,
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
      setError(data.error || "Erro ao criar licença");
      setSaving(false);
      return;
    }

    router.push("/processos");
    router.refresh();
  }

  return (
    <div>
      <Topbar icon={FolderKanban} title="Nova Licença" subtitle="Digite o número da licença para importar os dados do órgão" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">Upload de Licença</h2>
            <p className="text-xs text-[var(--color-ink-500)]">Anexe o documento da licença (PDF ou imagem) para preenchimento automático de nº da licença, protocolo, validade, condicionantes, tipo e órgão.</p>

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

            {uploadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{uploadError}</div>
            )}
          </div>

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">Dados da licença</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nº Licença</label>
                <div className="flex gap-2">
                  <input
                    value={form.numLicenca}
                    onChange={(e) => setField("numLicenca", e.target.value)}
                    placeholder="Digite o número da licença"
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                  <button
                    type="button"
                    onClick={buscarDadosPublicos}
                    disabled={buscandoSia}
                    className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                    title="Buscar dados automaticamente no IAT/SGA ou IMA/SC"
                  >
                    {buscandoSia ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                  {buscandoSia
                    ? "Consultando o órgão ambiental..."
                    : orgaoMunicipal()
                      ? "Órgão municipal: a importação é feita pelo upload do documento (PDF)."
                      : "Ao digitar o número, o sistema consulta o IAT (PR) ou o IMA (SC) e preenche modalidade, validade, atividade e município."}
                </p>
              </div>
              {!orgaoMunicipal() && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nº Protocolo</label>
                  <input value={form.numProtocolo} onChange={(e) => setField("numProtocolo", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Modalidade</label>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setField("alertaDias", alertaPadraoPara(e.target.value)); }} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                  <option value="">Selecione...</option>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="Outros">Outros</option>
                </select>
                {tipo === "Outros" && (
                  <input value={tipoOutro} onChange={(e) => setTipoOutro(e.target.value)} placeholder="Especifique a modalidade" className="mt-2 w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Órgão</label>
                <select value={form.orgaoId} onChange={(e) => setField("orgaoId", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                  <option value="">Selecione...</option>
                  {orgaos.map((o) => <option key={o.id} value={o.id}>{o.sigla}</option>)}
                  <option value="outro">Outro...</option>
                </select>
                {form.orgaoId === "outro" && (
                  <input value={orgaoOutro} onChange={(e) => setOrgaoOutro(e.target.value)} placeholder="Digite o nome/sigla do órgão" className="mt-2 w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Atividade</label>
                <input value={form.atividade} onChange={(e) => setField("atividade", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Município</label>
                <input value={form.municipio} onChange={(e) => setField("municipio", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
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
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Status</label>
                <select value={form.status} onChange={(e) => setField("status", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
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
