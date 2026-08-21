"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/Topbar";
import { Truck, RefreshCw, Send, Link2, Loader2, CheckCircle2, AlertTriangle, XCircle, FileDown, Trash2, Ban, ShieldCheck, Clock, Plus, X, Pencil, PackagePlus, Bookmark, Save } from "lucide-react";
import { useToast } from "@/components/Toast";

type ToastFn = (message: string, type?: "success" | "error" | "info" | "warning") => void;

type Tab = "painel" | "meusMtrs" | "emitir" | "modelos" | "conexoes";

interface Conexao {
  id: number;
  nome: string;
  cnpj: string;
  unidade: string;
  empreendimentoId: number | null;
  modo: string;
  ativo: boolean;
  venceEm: string | null;
  ultimoUsoEm: string | null;
  temToken: boolean;
  _count?: { manifestos: number };
}

interface EmpreendimentoOpcao {
  id: number;
  apelido: string;
  cnpj: string | null;
  unidadeSinir: string | null;
  descricao: string;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  complemento: string | null;
  cliente: { id: number; apelido: string; cnpj: string; razaoSocial: string };
}

interface Manifesto {
  id: number;
  numero: string;
  status: string;
  certificado: boolean;
  clienteNome: string | null;
  empreendNome: string | null;
  transportadorNome: string | null;
  destinadorNome: string | null;
  resumo: string | null;
  quantidade: number | null;
  unidade: string | null;
  dataExpedicao: string | null;
  dataRecebimento: string | null;
  conexao: { id: number; nome: string; modo: string };
}

interface ResiduoCadastro {
  resCodigoIbama: string;
  marQuantidade: string;
  marDensidade: string;
  uniCodigo: string;
  tieCodigo: string;
  claCodigo: string;
  tiaCodigo: string;
  traCodigo: string;
  marNumeroONU: string;
  marClasseRisco: string;
  marNomeEmbarque: string;
  marGrupoEmbalagem: string;
  marCodigoInterno: string;
  marDescricaoInterna: string;
  observacoes: string;
}

interface SinirCatalogosFront {
  residuos: { resCodigoIbama: string; resNome: string }[];
  unidades: { uniCodigo: number; uniNome: string; uniSigla: string }[];
  estadosFisicos: { tieCodigo: number; tieDescricao: string }[];
  classes: { claCodigo: number; claNome: string }[];
  acondicionamentos: { tiaCodigo: number; tiaDescricao: string }[];
  tratamentos: { traCodigo: number; traDescricao: string }[];
}

interface ModeloMtr {
  id: number;
  nome: string;
  descricao: string | null;
  conexaoId: number | null;
  clienteNome: string | null;
  empreendNome: string | null;
  nomeResponsavel: string | null;
  transportadorCnpj: string | null;
  transportadorUnidade: number | null;
  transportadorNome: string | null;
  transportadorEndereco: string | null;
  transportadorNumero: string | null;
  transportadorUf: string | null;
  transportadorCidade: string | null;
  transportadorCep: string | null;
  transportadorLicenca: string | null;
  transportadorOrgao: string | null;
  destinadorCnpj: string | null;
  destinadorUnidade: number | null;
  destinadorNome: string | null;
  destinadorEndereco: string | null;
  destinadorNumero: string | null;
  destinadorUf: string | null;
  destinadorCidade: string | null;
  destinadorCep: string | null;
  destinadorLicenca: string | null;
  destinadorOrgao: string | null;
  nomeMotorista: string | null;
  placaVeiculo: string | null;
  observacoes: string | null;
  residuos: ResiduoCadastro[];
  conexao: { id: number; nome: string; modo: string } | null;
}

const PESO_MAX_TONELADAS = 45;

interface ParceiroUnidade {
  unidade: number;
  nome: string;
  endereco: string;
}

const STATUS_BADGE: Record<string, string> = {
  CERTIFICADO: "bg-green-50 text-green-700",
  SALVO: "bg-red-50 text-red-700",
  EMITIDO: "bg-blue-50 text-blue-700",
  RECEBIDO: "bg-amber-50 text-amber-700",
  CANCELADO: "bg-red-50 text-red-700",
  ARMAZ_TEMPORARIO: "bg-purple-50 text-purple-700",
};

function fmtData(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtQtd(v: number | null, u: string | null) {
  if (v == null) return "—";
  return `${v.toLocaleString("pt-BR")} ${u || ""}`.trim();
}

export default function SinirPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const perfil = (session?.user as Record<string, unknown> | undefined)?.perfil as string | undefined;
  const ehPrivilegiado = perfil === "socio" || perfil === "admin";
  const [tab, setTab] = useState<Tab>("painel");

  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [manifestos, setManifestos] = useState<Manifesto[]>([]);
  const [manifestosLoading, setManifestosLoading] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOpcao[]>([]);
  const [modelos, setModelos] = useState<ModeloMtr[]>([]);

  const carregarConexoes = useCallback(async () => {
    try {
      const res = await fetch("/api/sinir/conexoes");
      if (res.ok) setConexoes(await res.json());
    } catch {
      // silencioso
    }
  }, []);

  const carregarModelos = useCallback(async () => {
    try {
      const res = await fetch("/api/sinir/modelos");
      if (res.ok) setModelos(await res.json());
    } catch {
      // silencioso
    }
  }, []);

  const carregarManifestos = useCallback(async () => {
    setManifestosLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtro === "pendentes") params.set("pendentes", "1");
      if (filtro === "certificados") params.set("certificados", "1");
      const res = await fetch(`/api/sinir/manifestos?${params}`);
      if (res.ok) setManifestos(await res.json());
    } catch {
      setManifestos([]);
    } finally {
      setManifestosLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/sinir/conexoes", { signal: controller.signal });
        if (res.ok) setConexoes(await res.json());
      } catch {
        if (!controller.signal.aborted) setConexoes([]);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/sinir/modelos", { signal: controller.signal });
        if (res.ok) setModelos(await res.json());
      } catch {
        if (!controller.signal.aborted) setModelos([]);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/empreendimentos", { signal: controller.signal });
        if (res.ok) setEmpreendimentos(await res.json());
      } catch {
        if (!controller.signal.aborted) setEmpreendimentos([]);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setManifestosLoading(true);
      try {
        const params = new URLSearchParams();
        if (filtro === "pendentes") params.set("pendentes", "1");
        if (filtro === "certificados") params.set("certificados", "1");
        const res = await fetch(`/api/sinir/manifestos?${params}`, { signal: controller.signal });
        if (res.ok) setManifestos(await res.json());
      } catch {
        if (!controller.signal.aborted) setManifestos([]);
      } finally {
        if (!controller.signal.aborted) setManifestosLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filtro]);

  const certificados = manifestos.filter((m) => m.certificado).length;
  const pendentes = manifestos.filter((m) => !m.certificado && m.status !== "CANCELADO").length;
  const cancelados = manifestos.filter((m) => m.status === "CANCELADO").length;

  return (
    <div>
      <Topbar
        icon={Truck}
        title="SINIR MTR"
        subtitle="Verificação de certificação de cargas (MTR) e emissão de manifestos via SINIR Nacional"
      />

      <div className="mb-4 flex gap-1 border-b border-[var(--color-paper-200)]">
        {(
          [
            { key: "painel", label: "Painel" },
            { key: "meusMtrs", label: "Meus MTRs" },
            { key: "emitir", label: "Emitir MTR" },
            { key: "modelos", label: "Modelos" },
            ...(ehPrivilegiado ? [{ key: "conexoes" as Tab, label: "Conexões" }] : []),
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]"
                : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "painel" && (
        <PainelTab
          conexoes={conexoes}
          empreendimentos={empreendimentos}
          manifestos={manifestos}
          loading={manifestosLoading}
          certificados={certificados}
          pendentes={pendentes}
          cancelados={cancelados}
          filtro={filtro}
          setFiltro={setFiltro}
          onVerificar={() => carregarManifestos()}
          toast={toast}
        />
      )}

      {tab === "meusMtrs" && (
        <MeusMtrsTab conexoes={conexoes} filtro={filtro} setFiltro={setFiltro} onVerificar={() => carregarManifestos()} toast={toast} />
      )}

      {tab === "emitir" && (
        <EmitirTab
          conexoes={conexoes}
          empreendimentos={empreendimentos}
          modelos={modelos}
          onEmitido={() => { carregarManifestos(); carregarConexoes(); }}
          onModelosChanged={() => carregarModelos()}
          toast={toast}
        />
      )}

      {tab === "modelos" && (
        <ModelosTab conexoes={conexoes} modelos={modelos} onChanged={() => carregarModelos()} toast={toast} />
      )}

      {tab === "conexoes" && ehPrivilegiado && (
        <ConexoesTab conexoes={conexoes} empreendimentos={empreendimentos} onChanged={() => carregarConexoes()} toast={toast} />
      )}
    </div>
  );
}

// ---------- Painel ----------

function PainelTab(props: {
  conexoes: Conexao[];
  empreendimentos: EmpreendimentoOpcao[];
  manifestos: Manifesto[];
  loading: boolean;
  certificados: number;
  pendentes: number;
  cancelados: number;
  filtro: string;
  setFiltro: (f: string) => void;
  onVerificar: () => void;
  toast: ToastFn;
}) {
  const { conexoes, empreendimentos, manifestos, loading, certificados, pendentes, cancelados, filtro, setFiltro, onVerificar, toast } = props;
  const [verificando, setVerificando] = useState(false);
  const [conexaoId, setConexaoId] = useState("");
  const [dataInicial, setDataInicial] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().slice(0, 10));
  const [resumoVerif, setResumoVerif] = useState<{ total: number; certificados: number; pendentes: number; modo: string } | null>(null);
  const [dmrEmpId, setDmrEmpId] = useState("");
  const [dmrTrimestre, setDmrTrimestre] = useState(String(Math.floor((new Date().getMonth()) / 3) + 1));
  const [dmrAno, setDmrAno] = useState(String(new Date().getFullYear()));
  const [gerandoDmr, setGerandoDmr] = useState(false);
  const [enviandoControle, setEnviandoControle] = useState(false);
  const [modalCancel, setModalCancel] = useState<Manifesto | null>(null);
  const [justificativaCancel, setJustificativaCancel] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  async function marcarNoControle() {
    if (!dmrEmpId) {
      toast("Selecione o empreendimento", "error");
      return;
    }
    setEnviandoControle(true);
    try {
      let registroId: number | undefined;
      const res = await fetch("/api/controle-dmr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empreendimentoId: Number(dmrEmpId) }),
      });
      if (res.status === 201) {
        registroId = (await res.json()).id;
      } else {
        const data = await res.json();
        const resLista = await fetch("/api/controle-dmr");
        if (!resLista.ok) throw new Error(data.error || "Falha ao listar controle DMR");
        const lista = await resLista.json();
        registroId = lista.find((r: { empreendimentoId: number }) => r.empreendimentoId === Number(dmrEmpId))?.id;
        if (!registroId) throw new Error(data.error || "Registro não encontrado no controle DMR");
      }
      const prefixo = `t${dmrTrimestre}`;
      const resPatch = await fetch(`/api/controle-dmr/${registroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`${prefixo}Dmr`]: "OK", [`${prefixo}Mtr`]: "OK" }),
      });
      if (!resPatch.ok) throw new Error("Falha ao atualizar status");
      toast(`Enviado ao controle DMR como OK (${dmrTrimestre}º trimestre)`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao enviar para o controle DMR", "error");
    } finally {
      setEnviandoControle(false);
    }
  }

  async function gerarDmr() {
    if (!conexaoEfetiva || !dmrEmpId) {
      toast("Selecione a conexão e o empreendimento para a DMR", "error");
      return;
    }
    setGerandoDmr(true);
    try {
      const params = new URLSearchParams({
        conexaoId: conexaoEfetiva,
        empreendimentoId: dmrEmpId,
        trimestre: dmrTrimestre,
        ano: dmrAno,
      });
      const res = await fetch(`/api/sinir/dmr?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao gerar a DMR", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DMR-${dmrTrimestre}T-${dmrAno}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("DMR gerada — envio oficial deve ser feito no portal mtr.sinir.gov.br", "success");
    } catch {
      toast("Falha ao gerar a DMR", "error");
    } finally {
      setGerandoDmr(false);
    }
  }

  async function baixarArquivo(tipo: "mtr" | "cdf", m: Manifesto) {
    const prefixo = tipo === "cdf" ? "CDF" : "MTR";
    try {
      const res = await fetch(`/api/sinir/manifestos/${m.id}/download${tipo === "cdf" ? "?tipo=cdf" : ""}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || `Falha ao baixar o ${prefixo}`, "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefixo}-${m.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast(`Falha ao baixar o ${prefixo}`, "error");
    }
  }

  async function baixarManifesto(m: Manifesto) {
    await baixarArquivo("mtr", m);
  }

  async function baixarCdf(m: Manifesto) {
    toast("Consultando o CDF no SINIR...", "info");
    await baixarArquivo("cdf", m);
  }

  function abrirModalCancelamento(m: Manifesto) {
    setModalCancel(m);
    setJustificativaCancel("");
  }

  async function confirmarCancelamento() {
    const m = modalCancel;
    if (!m) return;
    if (!justificativaCancel.trim()) {
      toast("Informe a justificativa do cancelamento", "error");
      return;
    }
    setCancelando(true);
    try {
      const res = await fetch("/api/sinir/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: m.conexao.id, numero: m.numero, justificativa: justificativaCancel.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao cancelar", "error");
        return;
      }
      onVerificar();
      toast(`MTR ${m.numero} cancelado${data?.simulacao ? " (simulação)" : ""}`, "success");
      setModalCancel(null);
      setJustificativaCancel("");
    } catch {
      toast("Falha ao cancelar", "error");
    } finally {
      setCancelando(false);
    }
  }

  async function excluirManifesto(m: Manifesto) {
    if (!confirm(`Excluir o manifesto ${m.numero}?`)) return;
    try {
      const res = await fetch(`/api/sinir/manifestos?id=${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao excluir", "error");
        return;
      }
      onVerificar();
      toast("Manifesto excluído", "success");
    } catch {
      toast("Falha ao excluir", "error");
    }
  }

  async function verificar() {
    if (!conexaoEfetiva) {
      toast("Selecione uma conexão", "error");
      return;
    }
    setVerificando(true);
    setResumoVerif(null);
    try {
      const res = await fetch("/api/sinir/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: Number(conexaoEfetiva), dataInicial, dataFinal }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao verificar", "error");
        return;
      }
      setResumoVerif({ total: data.total, certificados: data.certificados, pendentes: data.pendentes, modo: data.conexao.modo });
      onVerificar();
      toast(data.pendentes > 0 ? `${data.pendentes} carga(s) sem certificação` : "Todas as cargas certificadas", data.pendentes > 0 ? "warning" : "success");
    } catch {
      toast("Erro ao verificar manifestos", "error");
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Verificar certificação</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-ink-500)]">Conexão</label>
            <select value={conexaoEfetiva} onChange={(e) => setConexaoId(e.target.value)} className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm">
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} {c.modo === "mock" ? "(simulação)" : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-ink-500)]">De</label>
            <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-ink-500)]">Até</label>
            <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm" />
          </div>
          <button onClick={verificar} disabled={verificando || conexoes.length === 0}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
            {verificando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {verificando ? "Verificando..." : "Verificar"}
          </button>
        </div>
        {conexoes.length === 0 && (
          <p className="mt-3 text-xs text-[var(--color-ink-500)]">Nenhuma conexão cadastrada — vá na aba Conexões para adicionar (modo simulação já funciona sem token).</p>
        )}
        {resumoVerif && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[var(--color-paper-50)] p-3 text-center">
              <p className="text-2xl font-semibold text-[var(--color-ink-900)]">{resumoVerif.total}</p>
              <p className="text-xs text-[var(--color-ink-500)]">Total no período</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-2xl font-semibold text-green-700">{resumoVerif.certificados}</p>
              <p className="text-xs text-green-600">Certificadas</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${resumoVerif.pendentes > 0 ? "bg-amber-50" : "bg-[var(--color-paper-50)]"}`}>
              <p className={`text-2xl font-semibold ${resumoVerif.pendentes > 0 ? "text-amber-700" : "text-[var(--color-ink-900)]"}`}>{resumoVerif.pendentes}</p>
              <p className={`text-xs ${resumoVerif.pendentes > 0 ? "text-amber-600" : "text-[var(--color-ink-500)]"}`}>Sem certificação</p>
            </div>
          </div>
        )}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Declaração DMR</h2>
          <span className="text-xs text-[var(--color-ink-400)]">Modelo de referência do SINIR — envio oficial no portal mtr.sinir.gov.br</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-ink-500)]">Empreendimento (declarante)</label>
            <select value={dmrEmpId} onChange={(e) => setDmrEmpId(e.target.value)} className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm">
              <option value="">Selecione...</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.cliente.apelido} — {e.apelido}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-ink-500)]">Trimestre</label>
            <select value={dmrTrimestre} onChange={(e) => setDmrTrimestre(e.target.value)} className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm">
              <option value="1">1º trimestre</option>
              <option value="2">2º trimestre</option>
              <option value="3">3º trimestre</option>
              <option value="4">4º trimestre</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-ink-500)]">Ano</label>
            <input type="number" value={dmrAno} onChange={(e) => setDmrAno(e.target.value)} className="w-24 rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm" />
          </div>
          <button onClick={gerarDmr} disabled={gerandoDmr || !conexaoEfetiva || !dmrEmpId}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-ink-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-ink-900)] disabled:opacity-50">
            {gerandoDmr ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {gerandoDmr ? "Gerando..." : "Gerar DMR (PDF)"}
          </button>
          <button onClick={marcarNoControle} disabled={enviandoControle || !dmrEmpId}
            title="Adiciona o empreendimento ao módulo DMR e marca este trimestre como OK"
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {enviandoControle ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {enviandoControle ? "Enviando..." : "Enviar ao controle DMR (OK)"}
          </button>
        </div>
        {!conexaoEfetiva && (
          <p className="mt-3 text-xs text-[var(--color-ink-500)]">Selecione a conexão no card de verificação para usar seus manifestos na DMR.</p>
        )}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Manifestos</h2>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setFiltro("todos")} className={`rounded-full px-3 py-1 font-medium ${filtro === "todos" ? "bg-[var(--color-brand-500)] text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Todos ({certificados + pendentes + cancelados})
            </button>
            <button onClick={() => setFiltro("pendentes")} className={`rounded-full px-3 py-1 font-medium ${filtro === "pendentes" ? "bg-amber-500 text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Pendentes ({pendentes})
            </button>
            <button onClick={() => setFiltro("certificados")} className={`rounded-full px-3 py-1 font-medium ${filtro === "certificados" ? "bg-green-600 text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Certificados ({certificados})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--color-brand-500)]" />
          </div>
        ) : manifestos.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-500)]">
            Nenhum manifesto ainda. Use a verificação acima para listar as cargas do período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Número</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Cliente</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Empreendimento</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Quantidade</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Expedição</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Situação</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {manifestos.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-mono text-xs text-[var(--color-ink-700)]">{m.numero}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-700)]">{m.clienteNome || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.empreendNome || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{fmtQtd(m.quantidade, m.unidade)}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{fmtData(m.dataExpedicao)}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
                        {m.certificado ? <CheckCircle2 size={12} /> : m.status === "CANCELADO" ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                        {m.status === "CERTIFICADO" ? "Certificado" : m.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => baixarManifesto(m)}
                          title="Baixar PDF do MTR"
                          className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]"
                        >
                          <FileDown size={15} />
                        </button>
                        {m.status !== "CANCELADO" && (
                          <button
                            onClick={() => baixarCdf(m)}
                            title="Baixar CDF (Certificado de Destinação Final) deste MTR no SINIR"
                            className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-green-50 hover:text-green-700"
                          >
                            <ShieldCheck size={15} />
                          </button>
                        )}
                        {m.status !== "CANCELADO" && (
                          <button
                            onClick={() => abrirModalCancelamento(m)}
                            title="Cancelar MTR"
                            className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => excluirManifesto(m)}
                          title="Excluir"
                          className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!cancelando) setModalCancel(null); }}>
          <div
            className="shadow-card w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display flex items-center gap-2 text-base font-semibold text-[var(--color-ink-900)]">
                <Ban size={18} className="text-red-600" />
                Cancelar MTR {modalCancel.numero}
              </h3>
              <button onClick={() => setModalCancel(null)} disabled={cancelando} className="rounded-md p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)]">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--color-ink-600)]">
              O cancelamento será enviado ao SINIR{modalCancel.conexao.modo === "mock" ? " (modo simulação)" : ""}. Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-ink-500)]">Justificativa *</label>
              <textarea
                value={justificativaCancel}
                onChange={(e) => setJustificativaCancel(e.target.value)}
                rows={4}
                maxLength={500}
                autoFocus
                placeholder="Ex.: emissão com dados incorretos do destinador — será emitido novo MTR"
                className="w-full resize-y rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
              />
              <span className="text-right text-xs text-[var(--color-ink-400)]">{justificativaCancel.length}/500</span>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModalCancel(null)}
                disabled={cancelando}
                className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-50)]"
              >
                Voltar
              </button>
              <button
                onClick={() => void confirmarCancelamento()}
                disabled={cancelando || !justificativaCancel.trim()}
                className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelando ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                {cancelando ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Meus MTRs (rotina semanal) ----------

function diasEmSalvo(m: Manifesto) {
  const base = m.dataExpedicao ? new Date(m.dataExpedicao) : new Date();
  return Math.max(0, Math.floor((Date.now() - base.getTime()) / 86400000));
}

function MeusMtrsTab(props: {
  conexoes: Conexao[];
  filtro: string;
  setFiltro: (f: string) => void;
  onVerificar: () => void;
  toast: ToastFn;
}) {
  const { conexoes, filtro, setFiltro, onVerificar, toast } = props;
  const [conexaoId, setConexaoId] = useState("");
  const [gerandoAlerta, setGerandoAlerta] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [lista, setLista] = useState<Manifesto[]>([]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const hoje = new Date();
  const inicioPadrao = new Date(hoje.getTime() - 29 * 86400000);
  const [dataInicial, setDataInicial] = useState(`${inicioPadrao.getFullYear()}-${pad(inicioPadrao.getMonth() + 1)}-${pad(inicioPadrao.getDate())}`);
  const [dataFinal, setDataFinal] = useState(`${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`);

  const limiteDias = 7;
  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  const salvos = lista.filter(
    (m) => (m.status === "SALVO" || m.status === "EMITIDO") && !m.certificado
  );
  const emAtraso = salvos.filter((m) => diasEmSalvo(m) > limiteDias);

  async function consultarSinir(idConexao?: string) {
    const conexaoUsar = idConexao || conexaoEfetiva;
    if (!conexaoUsar) {
      toast("Selecione uma conexão", "error");
      return;
    }
    if (!dataInicial || !dataFinal) {
      toast("Informe o período de consulta", "error");
      return;
    }
    if (new Date(dataInicial) > new Date(dataFinal)) {
      toast("Período inválido — data inicial após a data final", "error");
      return;
    }
    setConsultando(true);
    try {
      const res = await fetch("/api/sinir/meus-mtrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: Number(conexaoUsar), dataInicial, dataFinal }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao consultar o SINIR", "error");
        return;
      }
      setLista(data.manifestos || []);
      onVerificar();
      toast(`SINIR consultado: ${data.total} MTR(s) de ${dataInicial} a ${dataFinal} (${data.papeis?.join(", ")})`, "success");
    } catch {
      toast("Falha ao consultar o SINIR", "error");
    } finally {
      setConsultando(false);
    }
  }

  async function baixarArquivoMeusMtrs(tipo: "mtr" | "cdf", m: Manifesto) {
    const prefixo = tipo === "cdf" ? "CDF" : "MTR";
    try {
      const res = await fetch(`/api/sinir/manifestos/${m.id}/download${tipo === "cdf" ? "?tipo=cdf" : ""}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || `Falha ao baixar o ${prefixo}`, "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefixo}-${m.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast(`Falha ao baixar o ${prefixo}`, "error");
    }
  }

  async function gerarAlertaPdf() {
    if (!conexaoEfetiva) {
      toast("Selecione uma conexão", "error");
      return;
    }
    setGerandoAlerta(true);
    try {
      const params = new URLSearchParams({ conexaoId: conexaoEfetiva, limiteDias: String(limiteDias) });
      const res = await fetch(`/api/sinir/relatorio-salvos?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao gerar o relatório", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "alerta-mtrs-salvos.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Relação de MTRs salvos gerada — pronta para enviar", "success");
    } catch {
      toast("Falha ao gerar o relatório", "error");
    } finally {
      setGerandoAlerta(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Meus MTRs — consulta semanal</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">
              Busca no SINIR todos os MTRs do período escolhido em que a empresa consta (gerador, transportador, destinador ou armazenador) — períodos maiores que 30 dias são divididos automaticamente. Situação de cada MTR: <b className="text-green-700">Recebido</b> = tudo ok; <b className="text-red-700">Salvo há mais de {limiteDias} dias</b> = avisar o cliente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={conexaoEfetiva}
              onChange={(e) => {
                setConexaoId(e.target.value);
                setLista([]);
                consultarSinir(e.target.value);
              }}
              className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
            >
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} {c.modo === "mock" ? "(simulação)" : ""}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 text-sm">
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="rounded-lg border border-[var(--color-paper-200)] px-2 py-2 text-sm"
              />
              <span className="text-[var(--color-ink-500)]">até</span>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="rounded-lg border border-[var(--color-paper-200)] px-2 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => consultarSinir()}
              disabled={consultando || conexoes.length === 0}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {consultando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {consultando ? "Consultando..." : "Consultar SINIR"}
            </button>
            <button
              onClick={gerarAlertaPdf}
              disabled={gerandoAlerta || emAtraso.length === 0}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {gerandoAlerta ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              {gerandoAlerta ? "Gerando..." : "Relação MTRs Salvos"}
            </button>
          </div>
        </div>

        {emAtraso.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <b>{emAtraso.length} MTR(s) em situação SALVO há mais de {limiteDias} dias</b> — envie o relatório ao chefe para avisar os clientes que as cargas não foram recebidas pelas empresas destinatárias.
          </div>
        )}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Lista de MTRs ({lista.length})</h2>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setFiltro("todos")} className={`rounded-full px-3 py-1 font-medium ${filtro === "todos" ? "bg-[var(--color-brand-500)] text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Todos ({lista.length})
            </button>
            <button onClick={() => setFiltro("pendentes")} className={`rounded-full px-3 py-1 font-medium ${filtro === "pendentes" ? "bg-amber-500 text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Sem recebimento ({salvos.length})
            </button>
          </div>
        </div>

        {consultando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--color-brand-500)]" />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-500)]">
            Nenhum MTR para o período informado. Ajuste as datas e clique em &quot;Consultar SINIR&quot;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Número</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Gerador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Destinador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Transportador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Expedição</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Situação</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista
                  .filter((m) => (filtro === "pendentes" ? (m.status === "SALVO" || m.status === "EMITIDO") && !m.certificado : true))
                  .map((m) => {
                    const salvo = (m.status === "SALVO" || m.status === "EMITIDO") && !m.certificado;
                    const atrasado = salvo && diasEmSalvo(m) > limiteDias;
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-[var(--color-paper-100)] ${atrasado ? "bg-red-50" : salvo ? "bg-amber-50/50" : ""}`}
                      >
                        <td className="py-2 px-2 font-mono text-xs text-[var(--color-ink-700)]">{m.numero}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-700)]">{m.clienteNome || "—"}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.destinadorNome || "—"}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.transportadorNome || "—"}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{fmtData(m.dataExpedicao)}</td>
                        <td className="py-2 px-2">
                          {m.status === "RECEBIDO" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 size={12} /> Recebido — ok
                            </span>
                          ) : salvo ? (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${atrasado ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {atrasado ? <AlertTriangle size={12} /> : <Clock size={12} />}
                              Salvo há {diasEmSalvo(m)} dia(s){atrasado ? " — avisar cliente" : ""}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
                              {m.status === "CERTIFICADO" ? <ShieldCheck size={12} /> : m.status === "CANCELADO" ? <XCircle size={12} /> : null}
                              {m.status === "CERTIFICADO" ? "Certificado" : m.status === "ARMAZ_TEMPORARIO" ? "Armazenamento temporário" : m.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => baixarArquivoMeusMtrs("mtr", m)}
                              title="Baixar PDF do MTR"
                              className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]"
                            >
                              <FileDown size={15} />
                            </button>
                            <button
                              onClick={() => {
                                toast("Consultando o CDF no SINIR...", "info");
                                baixarArquivoMeusMtrs("cdf", m);
                              }}
                              title="Baixar CDF (Certificado de Destinação Final) deste MTR no SINIR"
                              className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-green-50 hover:text-green-700"
                            >
                              <ShieldCheck size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Emitir ----------

function BuscaResiduo(props: {
  catalogos: SinirCatalogosFront | null;
  valor: string;
  onChange: (codigo: string) => void;
  inputCls: string;
}) {
  const { catalogos, valor, onChange, inputCls } = props;
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(valor);

  const lista = (catalogos?.residuos || []).filter((r) => {
    const t = texto.trim().toLowerCase();
    if (!t) return true;
    return r.resCodigoIbama.toLowerCase().includes(t) || r.resNome.toLowerCase().includes(t);
  }).slice(0, 50);

  const selecionado = catalogos?.residuos.find((r) => r.resCodigoIbama === valor);

  return (
    <div className="relative">
      <input
        value={texto}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(e.target.value);
          setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAberto(false);
        }}
        className={inputCls}
        placeholder="Digite o código ou descrição do resíduo para filtrar..."
      />
      {aberto && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--color-paper-200)] bg-white shadow-lg">
          {lista.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--color-ink-500)]">Nenhum resíduo encontrado.</p>
          ) : (
            lista.map((r) => (
              <button
                key={r.resCodigoIbama}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setTexto(r.resCodigoIbama);
                  onChange(r.resCodigoIbama);
                  setAberto(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-[var(--color-paper-50)]"
              >
                <span className="font-medium text-[var(--color-ink-800)]">{r.resCodigoIbama}</span>
                <span className="ml-2 text-xs text-[var(--color-ink-500)]">{r.resNome}</span>
              </button>
            ))
          )}
        </div>
      )}
      {selecionado && (
        <p className="rounded bg-[var(--color-paper-50)] px-2 py-1 text-xs text-[var(--color-ink-600)]">
          {selecionado.resNome}
        </p>
      )}
    </div>
  );
}

function EmitirTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; modelos: ModeloMtr[]; onEmitido: () => void; onModelosChanged: () => void; toast: ToastFn }) {
  const { conexoes, empreendimentos, modelos, onEmitido, onModelosChanged, toast } = props;
  const { data: session } = useSession();
  const nomeUsuario = session?.user?.name || "";
  const [form, setForm] = useState({
    conexaoId: "",
    empreendimentoId: "",
    clienteNome: "",
    empreendNome: "",
    resumo: "",
    quantidade: "",
    unidade: "kg",
    // Gerador
    geradorCnpj: "",
    geradorEndereco: "",
    geradorNumero: "",
    geradorUf: "",
    geradorCidade: "",
    nomeResponsavel: "",
    // Transportador
    transportadorCnpj: "",
    transportadorUnidade: "",
    transportadorNome: "",
    transportadorEndereco: "",
    transportadorNumero: "",
    transportadorUf: "",
    transportadorCidade: "",
    transportadorCep: "",
    transportadorLicenca: "",
    transportadorOrgao: "",
    nomeMotorista: "",
    placaVeiculo: "",
    dataExpedicao: "",
    // Destinador
    destinadorCnpj: "",
    destinadorUnidade: "",
    destinadorNome: "",
    destinadorEndereco: "",
    destinadorNumero: "",
    destinadorUf: "",
    destinadorCidade: "",
    destinadorCep: "",
    destinadorLicenca: "",
    destinadorOrgao: "",
    observacoes: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ numero: string; simulacao: boolean } | null>(null);
  const [unidadesTransp, setUnidadesTransp] = useState<ParceiroUnidade[]>([]);
  const [unidadesDest, setUnidadesDest] = useState<ParceiroUnidade[]>([]);
  const [residuos, setResiduos] = useState<ResiduoCadastro[]>([]);
  const [catalogos, setCatalogos] = useState<SinirCatalogosFront | null>(null);
  const [carregandoCatalogos, setCarregandoCatalogos] = useState(false);
  const [modalResiduo, setModalResiduo] = useState(false);
  const [editandoResiduo, setEditandoResiduo] = useState<number | null>(null);
  const [residuoForm, setResiduoForm] = useState<ResiduoCadastro>({
    resCodigoIbama: "",
    marQuantidade: "",
    marDensidade: "",
    uniCodigo: "",
    tieCodigo: "",
    claCodigo: "",
    tiaCodigo: "",
    traCodigo: "",
    marNumeroONU: "",
    marClasseRisco: "",
    marNomeEmbarque: "",
    marGrupoEmbalagem: "",
    marCodigoInterno: "",
    marDescricaoInterna: "",
    observacoes: "",
  });

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(form.conexaoId)) ? form.conexaoId : conexoes.length ? String(conexoes[0].id) : "";
  const responsavel = form.nomeResponsavel || nomeUsuario;

  useEffect(() => {
    if (!conexaoEfetiva) return;
    const controller = new AbortController();
    (async () => {
      setCarregandoCatalogos(true);
      try {
        const res = await fetch(`/api/sinir/catalogos?conexaoId=${conexaoEfetiva}`, { signal: controller.signal });
        if (res.ok) setCatalogos(await res.json());
      } catch {
        if (!controller.signal.aborted) setCatalogos(null);
      } finally {
        if (!controller.signal.aborted) setCarregandoCatalogos(false);
      }
    })();
    return () => controller.abort();
  }, [conexaoEfetiva]);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  function selecionarEmpreendimento(id: string) {
    const emp = empreendimentos.find((e) => e.id === Number(id));
    if (!emp) return;
    const cnpj = emp.cnpj || emp.cliente.cnpj;
    const enderecoCompleto = [emp.rua, emp.bairro, emp.complemento].filter(Boolean).join(", ") || "";
    setForm((f) => ({
      ...f,
      empreendimentoId: id,
      clienteNome: emp.cliente.razaoSocial || emp.cliente.apelido,
      empreendNome: emp.apelido,
      geradorCnpj: cnpj || f.geradorCnpj,
      geradorEndereco: enderecoCompleto,
      geradorNumero: emp.numero || "",
      geradorUf: emp.uf || "",
      geradorCidade: emp.municipio || "",
      resumo: emp.descricao ? `Resíduo — ${emp.descricao}` : f.resumo,
    }));
    toast(emp.rua ? `Empreendimento ${emp.apelido} preenchido (CNPJ ${cnpj || "não informado"} e endereço do gerador)` : `Empreendimento ${emp.apelido} preenchido (CNPJ ${cnpj || "não informado"} — informe o endereço do gerador)`, emp.rua ? "success" : "info");
  }

  async function buscarParceiro(tipo: "transp" | "dest") {
    const cnpj = (tipo === "transp" ? form.transportadorCnpj : form.destinadorCnpj).replace(/\D/g, "");
    if (cnpj.length !== 14) {
      toast("Informe um CNPJ com 14 dígitos para buscar", "error");
      return;
    }
    try {
      const [res, resUnidades] = await Promise.all([
        fetch(`/api/cnpj/${cnpj}`),
        fetch(`/api/sinir/parceiros?documento=${cnpj}`),
      ]);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "CNPJ não encontrado", "error");
        return;
      }
      const d = await res.json();
      const unidades: ParceiroUnidade[] = resUnidades.ok ? await resUnidades.json() : [];
      setForm((f) =>
        tipo === "transp"
          ? {
              ...f,
              transportadorCnpj: cnpj,
              transportadorNome: d.razaoSocial || f.transportadorNome,
              transportadorEndereco: d.enderecoRua || f.transportadorEndereco,
              transportadorNumero: d.enderecoNumero || f.transportadorNumero,
              transportadorUf: d.uf || f.transportadorUf,
              transportadorCidade: d.municipio || f.transportadorCidade,
              transportadorCep: d.cep || f.transportadorCep,
            }
          : {
              ...f,
              destinadorCnpj: cnpj,
              destinadorNome: d.razaoSocial || f.destinadorNome,
              destinadorEndereco: d.enderecoRua || f.destinadorEndereco,
              destinadorNumero: d.enderecoNumero || f.destinadorNumero,
              destinadorUf: d.uf || f.destinadorUf,
              destinadorCidade: d.municipio || f.destinadorCidade,
              destinadorCep: d.cep || f.destinadorCep,
            }
      );
      const setUnidades = tipo === "transp" ? setUnidadesTransp : setUnidadesDest;
      setUnidades(unidades);
      if (unidades.length === 1) {
        const unidade = String(unidades[0].unidade);
        setForm((f) => (tipo === "transp" ? { ...f, transportadorUnidade: unidade } : { ...f, destinadorUnidade: unidade }));
        toast(`Empresa encontrada: ${d.razaoSocial} — unidade SINIR ${unidade} preenchida`, "success");
      } else if (unidades.length > 1) {
        toast(`${d.razaoSocial}: ${unidades.length} unidades no SINIR — selecione a correta no campo Cód. Unidade`, "warning");
      } else {
        toast(`Empresa encontrada: ${d.razaoSocial}. Unidade não localizada no portal — informe o código manualmente`, "warning");
      }
    } catch {
      toast("Falha ao buscar o CNPJ", "error");
    }
  }

  function aplicarModelo(id: string) {
    const m = modelos.find((x) => x.id === Number(id));
    if (!m) return;
    setForm((f) => ({
      ...f,
      empreendimentoId: f.empreendimentoId,
      clienteNome: m.clienteNome || f.clienteNome,
      empreendNome: m.empreendNome || f.empreendNome,
      nomeResponsavel: m.nomeResponsavel || f.nomeResponsavel,
      transportadorCnpj: m.transportadorCnpj || "",
      transportadorUnidade: m.transportadorUnidade ? String(m.transportadorUnidade) : "",
      transportadorNome: m.transportadorNome || "",
      transportadorEndereco: m.transportadorEndereco || "",
      transportadorNumero: m.transportadorNumero || "",
      transportadorUf: m.transportadorUf || "",
      transportadorCidade: m.transportadorCidade || "",
      transportadorCep: m.transportadorCep || "",
      transportadorLicenca: m.transportadorLicenca || "",
      transportadorOrgao: m.transportadorOrgao || "",
      destinadorCnpj: m.destinadorCnpj || "",
      destinadorUnidade: m.destinadorUnidade ? String(m.destinadorUnidade) : "",
      destinadorNome: m.destinadorNome || "",
      destinadorEndereco: m.destinadorEndereco || "",
      destinadorNumero: m.destinadorNumero || "",
      destinadorUf: m.destinadorUf || "",
      destinadorCidade: m.destinadorCidade || "",
      destinadorCep: m.destinadorCep || "",
      destinadorLicenca: m.destinadorLicenca || "",
      destinadorOrgao: m.destinadorOrgao || "",
      nomeMotorista: m.nomeMotorista || "",
      placaVeiculo: m.placaVeiculo || "",
      observacoes: m.observacoes || f.observacoes,
      resumo: f.resumo,
      quantidade: f.quantidade,
      unidade: f.unidade,
    }));
    const residuosModelo = (m.residuos || []).map((r) => ({
      ...r,
      marQuantidade: "",
      marDensidade: "",
    }));
    setResiduos(residuosModelo);
    toast(`Modelo "${m.nome}" aplicado — preencha quantidade (e densidade) de cada resíduo`, "success");
  }

  async function salvarComoModelo() {
    if (!form.transportadorCnpj || form.transportadorCnpj.length !== 14 || !form.destinadorCnpj || form.destinadorCnpj.length !== 14) {
      toast("Preencha os CNPJs do transportador e destinador para salvar o modelo", "error");
      return;
    }
    if (!form.transportadorUnidade || !form.destinadorUnidade) {
      toast("Informe os códigos de unidade do transportador e do destinador para salvar o modelo", "error");
      return;
    }
    if (residuos.length === 0) {
      toast("Adicione pelo menos um resíduo para salvar o modelo", "error");
      return;
    }
    const nome = window.prompt("Nome do modelo:");
    if (!nome) return;
    try {
      const res = await fetch("/api/sinir/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          conexaoId: Number(conexaoEfetiva),
          clienteNome: form.clienteNome,
          empreendNome: form.empreendNome,
          nomeResponsavel: responsavel,
          transportadorCnpj: form.transportadorCnpj,
          transportadorUnidade: form.transportadorUnidade ? Number(form.transportadorUnidade) : null,
          transportadorNome: form.transportadorNome,
          transportadorEndereco: form.transportadorEndereco,
          transportadorNumero: form.transportadorNumero,
          transportadorUf: form.transportadorUf,
          transportadorCidade: form.transportadorCidade,
          transportadorCep: form.transportadorCep,
          transportadorLicenca: form.transportadorLicenca,
          transportadorOrgao: form.transportadorOrgao,
          destinadorCnpj: form.destinadorCnpj,
          destinadorUnidade: form.destinadorUnidade ? Number(form.destinadorUnidade) : null,
          destinadorNome: form.destinadorNome,
          destinadorEndereco: form.destinadorEndereco,
          destinadorNumero: form.destinadorNumero,
          destinadorUf: form.destinadorUf,
          destinadorCidade: form.destinadorCidade,
          destinadorCep: form.destinadorCep,
          destinadorLicenca: form.destinadorLicenca,
          destinadorOrgao: form.destinadorOrgao,
          nomeMotorista: form.nomeMotorista,
          placaVeiculo: form.placaVeiculo,
          observacoes: form.observacoes,
          residuos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao salvar o modelo", "error");
        return;
      }
      onModelosChanged();
      toast(`Modelo "${nome}" salvo`, "success");
    } catch {
      toast("Erro ao salvar o modelo", "error");
    }
  }

function abrirModalResiduo(indice?: number) {
    if (indice != null) {
      setResiduoForm(residuos[indice]);
      setEditandoResiduo(indice);
    } else {
      setResiduoForm({
        resCodigoIbama: "",
        marQuantidade: "",
        marDensidade: "",
        uniCodigo: "",
        tieCodigo: "",
        claCodigo: "",
        tiaCodigo: "",
        traCodigo: "",
        marNumeroONU: "",
        marClasseRisco: "",
        marNomeEmbarque: "",
        marGrupoEmbalagem: "",
        marCodigoInterno: "",
        marDescricaoInterna: "",
        observacoes: "",
      });
      setEditandoResiduo(null);
    }
    setModalResiduo(true);
  }

  function salvarResiduo() {
    if (!residuoForm.resCodigoIbama || !residuoForm.marQuantidade || !residuoForm.uniCodigo || !residuoForm.tieCodigo || !residuoForm.claCodigo || !residuoForm.tiaCodigo || !residuoForm.traCodigo) {
      toast("Preencha resíduo, quantidade, unidade, estado físico, classe, acondicionamento e tratamento", "error");
      return;
    }
    const formatoValido = Number(residuoForm.marQuantidade) > 0 && ["uniCodigo", "tieCodigo", "claCodigo", "tiaCodigo", "traCodigo"].every((k) => Number(residuoForm[k as keyof ResiduoCadastro]) > 0);
    if (!formatoValido) {
      toast("Quantidade e códigos devem ser números válidos", "error");
      return;
    }
    if (precisaDensidade(residuoForm.uniCodigo) && !(residuoForm.marDensidade && Number(residuoForm.marDensidade) > 0)) {
      toast("Informe a densidade — ela converte o volume em toneladas na emissão", "error");
      return;
    }
    const pesoLinha = pesoCalculado(residuoForm.marQuantidade, residuoForm.marDensidade, residuoForm.uniCodigo);
    if (pesoLinha != null && pesoLinha > PESO_MAX_TONELADAS) {
      toast(`Peso calculado (${pesoLinha.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} t) excede o máximo de ${PESO_MAX_TONELADAS} t`, "error");
      return;
    }
    setResiduos((r) => {
      const novo = [...r];
      if (editandoResiduo != null) novo[editandoResiduo] = residuoForm;
      else novo.push(residuoForm);
      return novo;
    });
    setModalResiduo(false);
    toast(editandoResiduo != null ? "Resíduo atualizado" : "Resíduo adicionado", "success");
  }

  function removerResiduo(indice: number) {
    setResiduos((r) => r.filter((_, i) => i !== indice));
    toast("Resíduo removido", "info");
  }

  function nomeResiduo(codigo: string) {
    return catalogos?.residuos.find((r) => r.resCodigoIbama === codigo)?.resNome || codigo;
  }
  function nomeUnidade(codigo: string) {
    return catalogos?.unidades.find((u) => u.uniCodigo === Number(codigo))?.uniSigla || codigo;
  }
  function nomeEstado(codigo: string) {
    return catalogos?.estadosFisicos.find((e) => e.tieCodigo === Number(codigo))?.tieDescricao || codigo;
  }
  function nomeClasse(codigo: string) {
    return catalogos?.classes.find((c) => c.claCodigo === Number(codigo))?.claNome || codigo;
  }
  function nomeAcond(codigo: string) {
    return catalogos?.acondicionamentos.find((a) => a.tiaCodigo === Number(codigo))?.tiaDescricao || codigo;
  }
  function nomeTrat(codigo: string) {
    return catalogos?.tratamentos.find((t) => t.traCodigo === Number(codigo))?.traDescricao || codigo;
  }
  function semAcento(texto: string) {
    return texto.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  }
  function tipoUnidade(codigo: string): "m3" | "litro" | "kg" | "tonelada" | "outro" {
    const u = catalogos?.unidades.find((x) => x.uniCodigo === Number(codigo));
    if (!u) return "outro";
    const nome = semAcento(u.uniNome);
    const sigla = semAcento(u.uniSigla);
    if (nome.includes("m3") || sigla.includes("m3") || nome.includes("metro cubico") || nome.includes("metros cubicos")) return "m3";
    if (nome.includes("litro") || sigla === "l") return "litro";
    if (nome.includes("tonelada") || sigla === "t" || sigla === "ton") return "tonelada";
    if (nome.includes("quilo") || sigla === "kg") return "kg";
    return "outro";
  }
  function precisaDensidade(codigo: string) {
    const t = tipoUnidade(codigo);
    return t === "m3" || t === "litro";
  }
  function rotuloDensidade(codigo: string) {
    return tipoUnidade(codigo) === "litro" ? "Densidade (g/cm³) *" : "Densidade (t/m³) *";
  }
  function pesoCalculado(quantidade: string, densidade: string, codigo: string): number | null {
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) return null;
    const t = tipoUnidade(codigo);
    if (t === "tonelada") return Math.round(qtd * 1000) / 1000;
    if (t === "kg") return Math.round((qtd / 1000) * 1000) / 1000;
    const dens = Number(densidade);
    if (!Number.isFinite(dens) || dens <= 0) return null;
    if (t === "m3") return Math.round(qtd * dens * 1000) / 1000;
    if (t === "litro") return Math.round(((qtd * dens) / 1000) * 1000) / 1000;
    return null;
  }
  function pesoExibido(r: ResiduoCadastro): string | null {
    if (tipoUnidade(r.uniCodigo) === "tonelada") return null;
    const peso = pesoCalculado(r.marQuantidade, r.marDensidade, r.uniCodigo);
    return peso != null && peso > 0 ? `≈ ${peso.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} t` : null;
  }
  function codigoToneladas(): number | undefined {
    const u = catalogos?.unidades.find((x) => {
      const nome = semAcento(x.uniNome);
      const sigla = x.uniSigla.toLowerCase();
      return nome.includes("tonelada") || sigla === "t" || sigla === "ton";
    });
    return u?.uniCodigo;
  }

  async function emitir() {
    if (!form.transportadorCnpj || form.transportadorCnpj.length !== 14 || !form.destinadorCnpj || form.destinadorCnpj.length !== 14) {
      toast("Preencha os CNPJs (14 dígitos) do transportador e destinador", "error");
      return;
    }
    const modoReal = conexoes.find((c) => c.id === Number(conexaoEfetiva))?.modo !== "mock";
    if (modoReal && (!form.transportadorUnidade || !form.destinadorUnidade)) {
      toast("Informe o código da unidade do transportador e do destinador (visível no portal SINIR — DMR/emissão)", "error");
      return;
    }
    if (residuos.length === 0) {
      toast("Adicione pelo menos um resíduo", "error");
      return;
    }
    if (residuos.some((r) => !r.marQuantidade || Number(r.marQuantidade) <= 0)) {
      toast("Informe a quantidade de cada resíduo antes de emitir", "error");
      return;
    }
    const codTon = codigoToneladas();
    if (!codTon) {
      toast("Não encontrei a unidade 'tonelada' no catálogo do SINIR para converter os pesos", "error");
      return;
    }
    let pesoTotal = 0;
    for (const r of residuos) {
      if (tipoUnidade(r.uniCodigo) === "outro") continue;
      const peso = pesoCalculado(r.marQuantidade, r.marDensidade, r.uniCodigo);
      const nomeLinha = r.marDescricaoInterna || nomeResiduo(r.resCodigoIbama);
      if (peso == null) {
        toast(`"${nomeLinha}": informe quantidade${precisaDensidade(r.uniCodigo) ? " e densidade" : ""} para calcular o peso em toneladas`, "error");
        return;
      }
      if (peso > PESO_MAX_TONELADAS) {
        toast(`"${nomeLinha}": peso calculado (${peso.toLocaleString("pt-BR")} t) excede o máximo de ${PESO_MAX_TONELADAS} t`, "error");
        return;
      }
      pesoTotal += peso;
    }
    if (pesoTotal > PESO_MAX_TONELADAS) {
      toast(`Peso total (${pesoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} t) excede o máximo de ${PESO_MAX_TONELADAS} t por MTR`, "error");
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const residuosPayload = residuos.map((r) => {
        const tipo = tipoUnidade(r.uniCodigo);
        const peso = pesoCalculado(r.marQuantidade, r.marDensidade, r.uniCodigo);
        const converte = tipo !== "outro" && peso != null;
        return {
          resCodigoIbama: r.resCodigoIbama,
          marQuantidade: converte ? peso : Number(r.marQuantidade),
          marDensidade: precisaDensidade(r.uniCodigo) && r.marDensidade ? Number(r.marDensidade) : undefined,
          uniCodigo: converte ? codTon : Number(r.uniCodigo),
          tieCodigo: Number(r.tieCodigo),
          claCodigo: Number(r.claCodigo),
          tiaCodigo: Number(r.tiaCodigo),
          traCodigo: Number(r.traCodigo),
          marNumeroONU: r.marNumeroONU || undefined,
          marClasseRisco: r.marClasseRisco || undefined,
          marNomeEmbarque: r.marNomeEmbarque || undefined,
          marGrupoEmbalagem: r.marGrupoEmbalagem || undefined,
          marCodigoInterno: r.marCodigoInterno || undefined,
          marDescricaoInterna: r.marDescricaoInterna || undefined,
          observacoes: r.observacoes || undefined,
        };
      });
      const quantidadeTotal = residuosPayload.reduce((soma, r) => soma + r.marQuantidade, 0);
      const resumo = residuos.map((r) => r.marDescricaoInterna || nomeResiduo(r.resCodigoIbama)).join("; ");
      const res = await fetch("/api/sinir/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nomeResponsavel: responsavel,
          conexaoId: Number(conexaoEfetiva),
          resumo,
          quantidade: quantidadeTotal,
          dataExpedicao: form.dataExpedicao ? new Date(`${form.dataExpedicao}T12:00:00`).getTime() : undefined,
          residuos: residuosPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao emitir", "error");
        return;
      }
      setResultado(data);
      onEmitido();
      toast(data.simulacao ? "MTR emitido em modo simulação" : "MTR emitido no SINIR", "success");
    } catch {
      toast("Erro ao emitir MTR", "error");
    } finally {
      setEnviando(false);
    }
  }

  function setCampo(nome: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [nome]: valor }));
  }

  const secaoTitulo = (titulo: string, sub: string) => (
    <div className="mt-6 mb-3 border-b border-[var(--color-paper-200)] pb-2">
      <h3 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">{titulo}</h3>
      <p className="text-xs text-[var(--color-ink-500)]">{sub}</p>
    </div>
  );

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      <h2 className="font-display mb-1 text-base font-semibold text-[var(--color-ink-900)]">Emitir Manifesto (MTR)</h2>
      <p className="mb-2 text-sm text-[var(--color-ink-500)]">Em modo simulação gera um MTR fictício. Em modo real envia ao SINIR com o token da conexão. Busque transportador e destinador pelo CNPJ — os dados de endereço são preenchidos automaticamente.</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Empreendimento (preenche os dados do gerador)</label>
          <select value={form.empreendimentoId} onChange={(e) => selecionarEmpreendimento(e.target.value)} className={inputCls}>
            <option value="">Selecione um empreendimento cadastrado...</option>
            {empreendimentos.map((e) => (
              <option key={e.id} value={e.id}>{e.cliente.apelido} — {e.apelido}{e.cnpj ? "" : " (sem CNPJ próprio)"}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Conexão</label>
          <select value={conexaoEfetiva} onChange={(e) => setForm((f) => ({ ...f, conexaoId: e.target.value }))} className={inputCls}>
            {conexoes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} {c.modo === "mock" ? "(simulação)" : ""}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Modelo pré-cadastrado</label>
          <div className="flex gap-2">
            <select value="" onChange={(e) => aplicarModelo(e.target.value)} className={inputCls}>
              <option value="">Selecione um modelo para preencher automaticamente...</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome} {m.conexao ? `(${m.conexao.nome})` : ""}</option>
              ))}
            </select>
            <button
              onClick={salvarComoModelo}
              title="Salvar o formulário atual como modelo pré-cadastrado"
              className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)]"
            >
              <Bookmark size={15} />
              Salvar como modelo
            </button>
          </div>
          <p className="text-xs text-[var(--color-ink-500)]">Ao aplicar um modelo, transportador, destinador e os resíduos são preenchidos — informe apenas a quantidade (e densidade) de cada resíduo.</p>
        </div>
      </div>

      {secaoTitulo("Dados do Gerador", "Empresa que gera o resíduo — preenchida pelo empreendimento")}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Gerador (razão social)</label>
          <input value={form.clienteNome} onChange={(e) => setCampo("clienteNome", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ</label>
          <input value={form.geradorCnpj} onChange={(e) => setCampo("geradorCnpj", e.target.value.replace(/\D/g, ""))} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Responsável *</label>
          <input value={responsavel} onChange={(e) => setCampo("nomeResponsavel", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Endereço</label>
          <input value={form.geradorEndereco} onChange={(e) => setCampo("geradorEndereco", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Nº</label>
          <input value={form.geradorNumero} onChange={(e) => setCampo("geradorNumero", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">UF</label>
          <input value={form.geradorUf} onChange={(e) => setCampo("geradorUf", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Cidade</label>
          <input value={form.geradorCidade} onChange={(e) => setCampo("geradorCidade", e.target.value)} className={inputCls} />
        </div>
      </div>

      {secaoTitulo("Dados do Transportador", "Pesquise o transportador por CNPJ")}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Transportador (razão social)</label>
          <input value={form.transportadorNome} onChange={(e) => setCampo("transportadorNome", e.target.value)} className={inputCls} />
        </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ</label>
            <input value={form.transportadorCnpj} onChange={(e) => { setCampo("transportadorCnpj", e.target.value.replace(/\D/g, "")); setUnidadesTransp([]); }} onBlur={() => { if (form.transportadorCnpj.replace(/\D/g, "").length === 14 && unidadesTransp.length === 0) void buscarParceiro("transp"); }} className={inputCls} placeholder="00000000000000" />
          </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]" title="Código da unidade deste parceiro no SINIR — preenchido automaticamente ao buscar pelo CNPJ">Cód. Unidade SINIR *</label>
          {unidadesTransp.length > 0 ? (
            <select value={form.transportadorUnidade} onChange={(e) => setCampo("transportadorUnidade", e.target.value)} className={inputCls}>
              <option value="">{unidadesTransp.length} unidade(s) encontrada(s) — selecione</option>
              {unidadesTransp.map((u) => (
                <option key={u.unidade} value={String(u.unidade)}>{u.unidade} — {u.nome}{u.endereco ? ` (${u.endereco})` : ""}</option>
              ))}
            </select>
          ) : (
            <input value={form.transportadorUnidade} onChange={(e) => setCampo("transportadorUnidade", e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="Preenche sozinho ao buscar pelo CNPJ" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Placa do veículo</label>
          <input value={form.placaVeiculo} onChange={(e) => setCampo("placaVeiculo", e.target.value.toUpperCase())} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Motorista</label>
          <input value={form.nomeMotorista} onChange={(e) => setCampo("nomeMotorista", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Data de expedição</label>
          <input type="date" value={form.dataExpedicao} onChange={(e) => setCampo("dataExpedicao", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Endereço</label>
          <input value={form.transportadorEndereco} onChange={(e) => setCampo("transportadorEndereco", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Nº</label>
          <input value={form.transportadorNumero} onChange={(e) => setCampo("transportadorNumero", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">UF</label>
          <input value={form.transportadorUf} onChange={(e) => setCampo("transportadorUf", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Cidade</label>
          <input value={form.transportadorCidade} onChange={(e) => setCampo("transportadorCidade", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">CEP</label>
          <input value={form.transportadorCep} onChange={(e) => setCampo("transportadorCep", e.target.value.replace(/\D/g, ""))} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Licença</label>
          <input value={form.transportadorLicenca} onChange={(e) => setCampo("transportadorLicenca", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Órgão Emissor</label>
          <input value={form.transportadorOrgao} onChange={(e) => setCampo("transportadorOrgao", e.target.value)} className={inputCls} />
        </div>
      </div>

      {secaoTitulo("Dados do Destinador", "Pesquise o destinador por CNPJ")}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Destinador (razão social)</label>
          <input value={form.destinadorNome} onChange={(e) => setCampo("destinadorNome", e.target.value)} className={inputCls} />
        </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ</label>
            <input value={form.destinadorCnpj} onChange={(e) => { setCampo("destinadorCnpj", e.target.value.replace(/\D/g, "")); setUnidadesDest([]); }} onBlur={() => { if (form.destinadorCnpj.replace(/\D/g, "").length === 14 && unidadesDest.length === 0) void buscarParceiro("dest"); }} className={inputCls} placeholder="00000000000000" />
          </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]" title="Código da unidade deste parceiro no SINIR — preenchido automaticamente ao buscar pelo CNPJ. Um mesmo CNPJ pode ter várias unidades.">Cód. Unidade SINIR *</label>
          {unidadesDest.length > 0 ? (
            <select value={form.destinadorUnidade} onChange={(e) => setCampo("destinadorUnidade", e.target.value)} className={inputCls}>
              <option value="">{unidadesDest.length} unidade(s) encontrada(s) — selecione</option>
              {unidadesDest.map((u) => (
                <option key={u.unidade} value={String(u.unidade)}>{u.unidade} — {u.nome}{u.endereco ? ` (${u.endereco})` : ""}</option>
              ))}
            </select>
          ) : (
            <input value={form.destinadorUnidade} onChange={(e) => setCampo("destinadorUnidade", e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="Preenche sozinho ao buscar pelo CNPJ" />
          )}
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Endereço</label>
          <input value={form.destinadorEndereco} onChange={(e) => setCampo("destinadorEndereco", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Nº</label>
          <input value={form.destinadorNumero} onChange={(e) => setCampo("destinadorNumero", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">UF</label>
          <input value={form.destinadorUf} onChange={(e) => setCampo("destinadorUf", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Cidade</label>
          <input value={form.destinadorCidade} onChange={(e) => setCampo("destinadorCidade", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">CEP</label>
          <input value={form.destinadorCep} onChange={(e) => setCampo("destinadorCep", e.target.value.replace(/\D/g, ""))} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Licença</label>
          <input value={form.destinadorLicenca} onChange={(e) => setCampo("destinadorLicenca", e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Órgão Emissor</label>
          <input value={form.destinadorOrgao} onChange={(e) => setCampo("destinadorOrgao", e.target.value)} className={inputCls} />
        </div>
      </div>

      {secaoTitulo("Resíduos", "Adicione os resíduos transportados — cada um é uma linha da tabela")}
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm text-[var(--color-ink-500)]">
          {carregandoCatalogos ? "Carregando catálogos do SINIR..." : `${residuos.length} resíduo(s) adicionado(s)`}
        </p>
        <button
          onClick={() => abrirModalResiduo()}
          className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
        >
          <Plus size={15} />
          Adicionar Resíduo
        </button>
      </div>

      {residuos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-6 text-center text-sm text-[var(--color-ink-500)]">
          Nenhum resíduo cadastrado. Clique em &quot;Adicionar Resíduo&quot; para incluir o primeiro.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-left">
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Resíduo</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Quantidade</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Estado</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Classe</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Acondicionamento</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Tratamento</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">ONU</th>
                <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {residuos.map((r, i) => (
                <tr key={i} className="border-b border-[var(--color-paper-100)]">
                  <td className="py-2 px-2 text-[var(--color-ink-700)]">
                    <div className="font-medium">{nomeResiduo(r.resCodigoIbama)}</div>
                    <div className="text-xs text-[var(--color-ink-500)]">{r.marDescricaoInterna || "—"}</div>
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap text-[var(--color-ink-700)]">
                    <div>{Number(r.marQuantidade).toLocaleString("pt-BR")} {nomeUnidade(r.uniCodigo)}</div>
                    {pesoExibido(r) && <div className="text-xs text-[var(--color-ink-500)]">{pesoExibido(r)}</div>}
                  </td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{nomeEstado(r.tieCodigo)}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{nomeClasse(r.claCodigo)}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{nomeAcond(r.tiaCodigo)}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{nomeTrat(r.traCodigo)}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{r.marNumeroONU || "—"}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirModalResiduo(i)} title="Editar resíduo" className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => removerResiduo(i)} title="Remover resíduo" className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Observações (0/4000)</label>
          <input value={form.observacoes} onChange={(e) => setCampo("observacoes", e.target.value.slice(0, 4000))} className={inputCls} placeholder="Observações adicionais" />
        </div>
      </div>

      <button onClick={emitir} disabled={enviando || conexoes.length === 0}
        className="focus-ring transition-brand mt-6 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
        {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {enviando ? "Emitindo..." : "Emitir MTR"}
      </button>

      {resultado && (
        <div className="mt-4 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-800)]">
            <CheckCircle2 size={16} className="text-green-600" />
            MTR {resultado.numero} {resultado.simulacao && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">simulação</span>}
          </p>
        </div>
      )}

      {modalResiduo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalResiduo(false)}>
          <div
            className="shadow-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display flex items-center gap-2 text-base font-semibold text-[var(--color-ink-900)]">
                <PackagePlus size={18} className="text-[var(--color-brand-500)]" />
                {editandoResiduo != null ? `Editar resíduo ${editandoResiduo + 1}` : "Adicionar Resíduo"}
              </h3>
              <button onClick={() => setModalResiduo(false)} className="rounded-md p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)]">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Resíduo / Código IBAMA *</label>
                <BuscaResiduo
                  catalogos={catalogos}
                  valor={residuoForm.resCodigoIbama}
                  onChange={(codigo) => setResiduoForm((f) => ({ ...f, resCodigoIbama: codigo }))}
                  inputCls={inputCls}
                />
                {carregandoCatalogos && <p className="text-xs text-[var(--color-ink-500)]">Carregando catálogos do SINIR...</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Quantidade *</label>
                <input type="number" step="0.01" min="0" value={residuoForm.marQuantidade} onChange={(e) => setResiduoForm((f) => ({ ...f, marQuantidade: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Unidade *</label>
                <select value={residuoForm.uniCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, uniCodigo: e.target.value, marDensidade: precisaDensidade(e.target.value) ? f.marDensidade : "" }))} className={inputCls}>
                  <option value="">Selecione...</option>
                  {catalogos?.unidades.map((u) => (
                    <option key={u.uniCodigo} value={u.uniCodigo}>{u.uniSigla} — {u.uniNome}</option>
                  ))}
                </select>
              </div>
              {precisaDensidade(residuoForm.uniCodigo) && (
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-medium text-[var(--color-ink-500)]">{rotuloDensidade(residuoForm.uniCodigo)}</label>
                  <input type="number" step="0.01" min="0" value={residuoForm.marDensidade} onChange={(e) => setResiduoForm((f) => ({ ...f, marDensidade: e.target.value }))} className={inputCls} placeholder={tipoUnidade(residuoForm.uniCodigo) === "litro" ? "Ex.: 1,2 — converte litros em toneladas (L × densidade ÷ 1000)" : "Ex.: 1,4 — converte m³ em toneladas (qtd × densidade)"} />
                </div>
              )}
              {(() => {
                const peso = pesoCalculado(residuoForm.marQuantidade, residuoForm.marDensidade, residuoForm.uniCodigo);
                if (peso == null) return null;
                const excede = peso > PESO_MAX_TONELADAS;
                return (
                  <p className={`md:col-span-2 text-xs ${excede ? "font-medium text-red-600" : "text-[var(--color-ink-500)]"}`}>
                    Peso calculado: {peso.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} t{excede ? ` — excede o máximo de ${PESO_MAX_TONELADAS} t` : ""}
                  </p>
                );
              })()}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Estado Físico *</label>
                <select value={residuoForm.tieCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, tieCodigo: e.target.value }))} className={inputCls}>
                  <option value="">Selecione...</option>
                  {catalogos?.estadosFisicos.map((e) => (
                    <option key={e.tieCodigo} value={e.tieCodigo}>{e.tieDescricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Classe *</label>
                <select value={residuoForm.claCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, claCodigo: e.target.value }))} className={inputCls}>
                  <option value="">Selecione...</option>
                  {catalogos?.classes.map((c) => (
                    <option key={c.claCodigo} value={c.claCodigo}>{c.claNome}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Acondicionamento *</label>
                <select value={residuoForm.tiaCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, tiaCodigo: e.target.value }))} className={inputCls}>
                  <option value="">Selecione...</option>
                  {catalogos?.acondicionamentos.map((a) => (
                    <option key={a.tiaCodigo} value={a.tiaCodigo}>{a.tiaDescricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Tratamento *</label>
                <select value={residuoForm.traCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, traCodigo: e.target.value }))} className={inputCls}>
                  <option value="">Selecione...</option>
                  {catalogos?.tratamentos.map((t) => (
                    <option key={t.traCodigo} value={t.traCodigo}>{t.traDescricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Número ONU</label>
                <input value={residuoForm.marNumeroONU} onChange={(e) => setResiduoForm((f) => ({ ...f, marNumeroONU: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Classe de Risco</label>
                <input value={residuoForm.marClasseRisco} onChange={(e) => setResiduoForm((f) => ({ ...f, marClasseRisco: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Nome de Embarque</label>
                <input value={residuoForm.marNomeEmbarque} onChange={(e) => setResiduoForm((f) => ({ ...f, marNomeEmbarque: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Grupo Embalagem</label>
                <input value={residuoForm.marGrupoEmbalagem} onChange={(e) => setResiduoForm((f) => ({ ...f, marGrupoEmbalagem: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Cód. Interno</label>
                <input value={residuoForm.marCodigoInterno} onChange={(e) => setResiduoForm((f) => ({ ...f, marCodigoInterno: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Descr. Interna</label>
                <input value={residuoForm.marDescricaoInterna} onChange={(e) => setResiduoForm((f) => ({ ...f, marDescricaoInterna: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Observação</label>
                <input value={residuoForm.observacoes} onChange={(e) => setResiduoForm((f) => ({ ...f, observacoes: e.target.value }))} className={inputCls} placeholder="Opcional" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalResiduo(false)}
                className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              >
                Cancelar
              </button>
              <button
                onClick={salvarResiduo}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                {editandoResiduo != null ? <Pencil size={15} /> : <Plus size={15} />}
                {editandoResiduo != null ? "Salvar alterações" : "Adicionar à tabela"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Modelos ----------

interface ModeloFormState {
  id: number | null;
  nome: string;
  descricao: string;
  conexaoId: string;
  clienteNome: string;
  empreendNome: string;
  nomeResponsavel: string;
  transportadorCnpj: string;
  transportadorUnidade: string;
  transportadorNome: string;
  transportadorEndereco: string;
  transportadorNumero: string;
  transportadorUf: string;
  transportadorCidade: string;
  transportadorCep: string;
  transportadorLicenca: string;
  transportadorOrgao: string;
  destinadorCnpj: string;
  destinadorUnidade: string;
  destinadorNome: string;
  destinadorEndereco: string;
  destinadorNumero: string;
  destinadorUf: string;
  destinadorCidade: string;
  destinadorCep: string;
  destinadorLicenca: string;
  destinadorOrgao: string;
  nomeMotorista: string;
  placaVeiculo: string;
  observacoes: string;
  residuos: ResiduoCadastro[];
}

const MODELO_FORM_VAZIO: ModeloFormState = {
  id: null,
  nome: "",
  descricao: "",
  conexaoId: "",
  clienteNome: "",
  empreendNome: "",
  nomeResponsavel: "",
  transportadorCnpj: "",
  transportadorUnidade: "",
  transportadorNome: "",
  transportadorEndereco: "",
  transportadorNumero: "",
  transportadorUf: "",
  transportadorCidade: "",
  transportadorCep: "",
  transportadorLicenca: "",
  transportadorOrgao: "",
  destinadorCnpj: "",
  destinadorUnidade: "",
  destinadorNome: "",
  destinadorEndereco: "",
  destinadorNumero: "",
  destinadorUf: "",
  destinadorCidade: "",
  destinadorCep: "",
  destinadorLicenca: "",
  destinadorOrgao: "",
  nomeMotorista: "",
  placaVeiculo: "",
  observacoes: "",
  residuos: [],
};

function ModelosTab(props: { conexoes: Conexao[]; modelos: ModeloMtr[]; onChanged: () => void; toast: ToastFn }) {
  const { conexoes, modelos, onChanged, toast } = props;
  const [form, setForm] = useState<ModeloFormState>(MODELO_FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [residuoModal, setResiduoModal] = useState(false);
  const [editandoResiduo, setEditandoResiduo] = useState<number | null>(null);
  const [residuoForm, setResiduoForm] = useState<ResiduoCadastro>({
    resCodigoIbama: "",
    marQuantidade: "",
    marDensidade: "",
    uniCodigo: "",
    tieCodigo: "",
    claCodigo: "",
    tiaCodigo: "",
    traCodigo: "",
    marNumeroONU: "",
    marClasseRisco: "",
    marNomeEmbarque: "",
    marGrupoEmbalagem: "",
    marCodigoInterno: "",
    marDescricaoInterna: "",
    observacoes: "",
  });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  function editarModelo(m: ModeloMtr) {
    setForm({
      id: m.id,
      nome: m.nome,
      descricao: m.descricao || "",
      conexaoId: m.conexaoId ? String(m.conexaoId) : "",
      clienteNome: m.clienteNome || "",
      empreendNome: m.empreendNome || "",
      nomeResponsavel: m.nomeResponsavel || "",
      transportadorCnpj: m.transportadorCnpj || "",
      transportadorUnidade: m.transportadorUnidade ? String(m.transportadorUnidade) : "",
      transportadorNome: m.transportadorNome || "",
      transportadorEndereco: m.transportadorEndereco || "",
      transportadorNumero: m.transportadorNumero || "",
      transportadorUf: m.transportadorUf || "",
      transportadorCidade: m.transportadorCidade || "",
      transportadorCep: m.transportadorCep || "",
      transportadorLicenca: m.transportadorLicenca || "",
      transportadorOrgao: m.transportadorOrgao || "",
      destinadorCnpj: m.destinadorCnpj || "",
      destinadorUnidade: m.destinadorUnidade ? String(m.destinadorUnidade) : "",
      destinadorNome: m.destinadorNome || "",
      destinadorEndereco: m.destinadorEndereco || "",
      destinadorNumero: m.destinadorNumero || "",
      destinadorUf: m.destinadorUf || "",
      destinadorCidade: m.destinadorCidade || "",
      destinadorCep: m.destinadorCep || "",
      destinadorLicenca: m.destinadorLicenca || "",
      destinadorOrgao: m.destinadorOrgao || "",
      nomeMotorista: m.nomeMotorista || "",
      placaVeiculo: m.placaVeiculo || "",
      observacoes: m.observacoes || "",
      residuos: Array.isArray(m.residuos) ? (m.residuos as ResiduoCadastro[]) : [],
    });
    toast(`Editando modelo "${m.nome}"`, "info");
  }

  function novoModelo() {
    setForm(MODELO_FORM_VAZIO);
  }

  function abrirModalResiduo(indice?: number) {
    if (typeof indice === "number") {
      const r = form.residuos[indice];
      if (r) {
        setResiduoForm({ ...r });
        setEditandoResiduo(indice);
      }
    } else {
      setResiduoForm({
        resCodigoIbama: "",
        marQuantidade: "",
        marDensidade: "",
        uniCodigo: "",
        tieCodigo: "",
        claCodigo: "",
        tiaCodigo: "",
        traCodigo: "",
        marNumeroONU: "",
        marClasseRisco: "",
        marNomeEmbarque: "",
        marGrupoEmbalagem: "",
        marCodigoInterno: "",
        marDescricaoInterna: "",
        observacoes: "",
      });
      setEditandoResiduo(null);
    }
    setResiduoModal(true);
  }

  function salvarResiduo() {
    if (!residuoForm.resCodigoIbama || !residuoForm.marQuantidade) {
      toast("Preencha o resíduo (código IBAMA) e a quantidade padrão do modelo", "error");
      return;
    }
    if (editandoResiduo === null) {
      setForm((f) => ({ ...f, residuos: [...f.residuos, residuoForm] }));
    } else {
      setForm((f) => {
        const lista = [...f.residuos];
        lista[editandoResiduo] = residuoForm;
        return { ...f, residuos: lista };
      });
    }
    setResiduoModal(false);
    setEditandoResiduo(null);
  }

  function removerResiduo(indice: number) {
    setForm((f) => ({ ...f, residuos: f.residuos.filter((_, i) => i !== indice) }));
  }

  async function buscarCnpj(qual: "transportador" | "destinador") {
    const cnpj = (qual === "transportador" ? form.transportadorCnpj : form.destinadorCnpj).replace(/\D/g, "");
    if (cnpj.length !== 14) {
      toast("Informe um CNPJ com 14 dígitos para buscar", "error");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "CNPJ não encontrado", "error");
        return;
      }
      const data = await res.json();
      const razao = data.razaoSocial || "";
      setForm((f) => (qual === "transportador" ? { ...f, transportadorNome: razao } : { ...f, destinadorNome: razao }));
      toast(`Razão social preenchida: ${razao}`, "success");
    } catch {
      toast("Falha ao buscar o CNPJ", "error");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function salvar() {
    if (!form.nome) {
      toast("Informe o nome do modelo", "error");
      return;
    }
    if (form.residuos.length === 0) {
      toast("Adicione pelo menos um resíduo ao modelo", "error");
      return;
    }
    if (form.transportadorCnpj.replace(/\D/g, "").length !== 14 || form.destinadorCnpj.replace(/\D/g, "").length !== 14) {
      toast("Preencha os CNPJs (14 dígitos) do transportador e do destinador", "error");
      return;
    }
    if (!form.transportadorUnidade || !form.destinadorUnidade) {
      toast("Informe os códigos de unidade SINIR do transportador e do destinador", "error");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        conexaoId: form.conexaoId ? Number(form.conexaoId) : null,
        clienteNome: form.clienteNome || null,
        empreendNome: form.empreendNome || null,
        nomeResponsavel: form.nomeResponsavel || null,
        transportadorCnpj: form.transportadorCnpj.replace(/\D/g, ""),
        transportadorUnidade: form.transportadorUnidade ? Number(form.transportadorUnidade) : null,
        transportadorNome: form.transportadorNome || null,
        transportadorEndereco: form.transportadorEndereco || null,
        transportadorNumero: form.transportadorNumero || null,
        transportadorUf: form.transportadorUf || null,
        transportadorCidade: form.transportadorCidade || null,
        transportadorCep: form.transportadorCep || null,
        transportadorLicenca: form.transportadorLicenca || null,
        transportadorOrgao: form.transportadorOrgao || null,
        destinadorCnpj: form.destinadorCnpj.replace(/\D/g, ""),
        destinadorUnidade: form.destinadorUnidade ? Number(form.destinadorUnidade) : null,
        destinadorNome: form.destinadorNome || null,
        destinadorEndereco: form.destinadorEndereco || null,
        destinadorNumero: form.destinadorNumero || null,
        destinadorUf: form.destinadorUf || null,
        destinadorCidade: form.destinadorCidade || null,
        destinadorCep: form.destinadorCep || null,
        destinadorLicenca: form.destinadorLicenca || null,
        destinadorOrgao: form.destinadorOrgao || null,
        nomeMotorista: form.nomeMotorista || null,
        placaVeiculo: form.placaVeiculo || null,
        observacoes: form.observacoes || null,
        residuos: form.residuos,
      };
      const res = await fetch(form.id ? `/api/sinir/modelos/${form.id}` : "/api/sinir/modelos", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao salvar modelo", "error");
        return;
      }
      toast(form.id ? `Modelo "${form.nome}" atualizado` : `Modelo "${form.nome}" criado`, "success");
      setForm(MODELO_FORM_VAZIO);
      onChanged();
    } catch {
      toast("Erro ao salvar modelo", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(m: ModeloMtr) {
    if (!confirm(`Remover o modelo "${m.nome}"?`)) return;
    const res = await fetch(`/api/sinir/modelos/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Modelo removido", "success");
      if (form.id === m.id) setForm(MODELO_FORM_VAZIO);
      onChanged();
    } else {
      toast("Falha ao remover modelo", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
            {form.id ? `Editando modelo: ${form.nome}` : "Novo modelo"}
          </h2>
          {form.id && (
            <button onClick={novoModelo} className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
              Novo modelo
            </button>
          )}
        </div>
        <p className="mb-4 text-sm text-[var(--color-ink-500)]">
          Um modelo pré-preenche o transportador, o destinador e os resíduos na emissão. Quantidade e densidade de cada resíduo ficam em branco para informar na hora de emitir.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Nome do modelo *</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className={inputCls} placeholder="Ex.: Transporte mensal de resíduos classe II" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Conexão padrão (opcional)</label>
            <select value={form.conexaoId} onChange={(e) => setForm((f) => ({ ...f, conexaoId: e.target.value }))} className={inputCls}>
              <option value="">Qualquer conexão</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} {c.modo === "mock" ? "(simulação)" : ""}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-display mb-2 mt-2 text-sm font-semibold text-[var(--color-ink-700)]">Transportador</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ *</label>
                <div className="flex gap-2">
                  <input value={form.transportadorCnpj} onChange={(e) => setForm((f) => ({ ...f, transportadorCnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
                  <button onClick={() => buscarCnpj("transportador")} disabled={buscandoCnpj} title="Buscar razão social"
                    className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)] disabled:opacity-50">
                    {buscandoCnpj ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Razão social</label>
                <input value={form.transportadorNome} onChange={(e) => setForm((f) => ({ ...f, transportadorNome: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]" title="Código da unidade deste parceiro no SINIR — visível no portal (DMR/emissão) ao buscar pelo CNPJ. Um mesmo CNPJ pode ter várias unidades.">Cód. Unidade SINIR *</label>
                <input value={form.transportadorUnidade} onChange={(e) => setForm((f) => ({ ...f, transportadorUnidade: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="Ex.: 400701" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Licença</label>
                <input value={form.transportadorLicenca} onChange={(e) => setForm((f) => ({ ...f, transportadorLicenca: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Órgão emissor</label>
                <input value={form.transportadorOrgao} onChange={(e) => setForm((f) => ({ ...f, transportadorOrgao: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Endereço</label>
                <input value={form.transportadorEndereco} onChange={(e) => setForm((f) => ({ ...f, transportadorEndereco: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Número</label>
                <input value={form.transportadorNumero} onChange={(e) => setForm((f) => ({ ...f, transportadorNumero: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">UF</label>
                <input value={form.transportadorUf} onChange={(e) => setForm((f) => ({ ...f, transportadorUf: e.target.value.toUpperCase() }))} className={inputCls} maxLength={2} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Cidade</label>
                <input value={form.transportadorCidade} onChange={(e) => setForm((f) => ({ ...f, transportadorCidade: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">CEP</label>
                <input value={form.transportadorCep} onChange={(e) => setForm((f) => ({ ...f, transportadorCep: e.target.value.replace(/\D/g, "") }))} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-display mb-2 mt-2 text-sm font-semibold text-[var(--color-ink-700)]">Destinador</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ *</label>
                <div className="flex gap-2">
                  <input value={form.destinadorCnpj} onChange={(e) => setForm((f) => ({ ...f, destinadorCnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
                  <button onClick={() => buscarCnpj("destinador")} disabled={buscandoCnpj} title="Buscar razão social"
                    className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)] disabled:opacity-50">
                    {buscandoCnpj ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Razão social</label>
                <input value={form.destinadorNome} onChange={(e) => setForm((f) => ({ ...f, destinadorNome: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]" title="Código da unidade deste parceiro no SINIR — visível no portal (DMR/emissão) ao buscar pelo CNPJ. Um mesmo CNPJ pode ter várias unidades.">Cód. Unidade SINIR *</label>
                <input value={form.destinadorUnidade} onChange={(e) => setForm((f) => ({ ...f, destinadorUnidade: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="Ex.: 400701" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Licença</label>
                <input value={form.destinadorLicenca} onChange={(e) => setForm((f) => ({ ...f, destinadorLicenca: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Órgão emissor</label>
                <input value={form.destinadorOrgao} onChange={(e) => setForm((f) => ({ ...f, destinadorOrgao: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Endereço</label>
                <input value={form.destinadorEndereco} onChange={(e) => setForm((f) => ({ ...f, destinadorEndereco: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Número</label>
                <input value={form.destinadorNumero} onChange={(e) => setForm((f) => ({ ...f, destinadorNumero: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">UF</label>
                <input value={form.destinadorUf} onChange={(e) => setForm((f) => ({ ...f, destinadorUf: e.target.value.toUpperCase() }))} className={inputCls} maxLength={2} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Cidade</label>
                <input value={form.destinadorCidade} onChange={(e) => setForm((f) => ({ ...f, destinadorCidade: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">CEP</label>
                <input value={form.destinadorCep} onChange={(e) => setForm((f) => ({ ...f, destinadorCep: e.target.value.replace(/\D/g, "") }))} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-display mb-2 mt-2 text-sm font-semibold text-[var(--color-ink-700)]">Resíduos do modelo</h3>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-paper-200)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] text-left">
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Resíduo (IBAMA)</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Qtde. padrão</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Unidade</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Classe</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {form.residuos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[var(--color-ink-500)]">Nenhum resíduo no modelo.</td>
                    </tr>
                  ) : (
                    form.residuos.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--color-paper-100)]">
                        <td className="py-2 px-2 text-[var(--color-ink-800)]">{r.resCodigoIbama}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-600)]">{r.marQuantidade}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-600)]">{r.uniCodigo}</td>
                        <td className="py-2 px-2 text-[var(--color-ink-600)]">{r.claCodigo}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <button onClick={() => abrirModalResiduo(i)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Editar">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => removerResiduo(i)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button onClick={() => abrirModalResiduo()} className="focus-ring transition-brand mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)]">
              <Plus size={15} /> Adicionar resíduo
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Motorista</label>
            <input value={form.nomeMotorista} onChange={(e) => setForm((f) => ({ ...f, nomeMotorista: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Placa do veículo</label>
            <input value={form.placaVeiculo} onChange={(e) => setForm((f) => ({ ...f, placaVeiculo: e.target.value.toUpperCase() }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} className={inputCls} rows={2} />
          </div>
        </div>
        <button onClick={salvar} disabled={salvando}
          className="focus-ring transition-brand mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {salvando ? "Salvando..." : form.id ? "Atualizar modelo" : "Salvar modelo"}
        </button>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Modelos cadastrados</h2>
        {modelos.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">Nenhum modelo cadastrado. Você também pode salvar o formulário da aba &quot;Emitir MTR&quot; como modelo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Nome</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Transportador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Destinador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Resíduos</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Conexão</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2">
                      <div className="font-medium text-[var(--color-ink-800)]">{m.nome}</div>
                      {m.descricao && <div className="text-xs text-[var(--color-ink-500)]">{m.descricao}</div>}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.transportadorNome || m.transportadorCnpj || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.destinadorNome || m.destinadorCnpj || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{Array.isArray(m.residuos) ? m.residuos.length : 0} resíduo(s)</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.conexao ? m.conexao.nome : "—"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => editarModelo(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remover(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {residuoModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="shadow-card mt-8 w-full max-w-2xl rounded-[var(--radius-card)] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
                {editandoResiduo === null ? "Adicionar resíduo" : "Editar resíduo"}
              </h3>
              <button onClick={() => setResiduoModal(false)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)]">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Resíduo (código IBAMA) *</label>
                <input value={residuoForm.resCodigoIbama} onChange={(e) => setResiduoForm((f) => ({ ...f, resCodigoIbama: e.target.value }))} className={inputCls} placeholder="Ex.: A001" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Quantidade padrão *</label>
                <input type="number" step="0.01" min="0" value={residuoForm.marQuantidade} onChange={(e) => setResiduoForm((f) => ({ ...f, marQuantidade: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Unidade *</label>
                <input value={residuoForm.uniCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, uniCodigo: e.target.value }))} className={inputCls} placeholder="Código da unidade" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Estado físico *</label>
                <input value={residuoForm.tieCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, tieCodigo: e.target.value }))} className={inputCls} placeholder="Código do estado físico" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Classe *</label>
                <input value={residuoForm.claCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, claCodigo: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Acondicionamento *</label>
                <input value={residuoForm.tiaCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, tiaCodigo: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Tratamento *</label>
                <input value={residuoForm.traCodigo} onChange={(e) => setResiduoForm((f) => ({ ...f, traCodigo: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Densidade</label>
                <input type="number" step="0.01" min="0" value={residuoForm.marDensidade} onChange={(e) => setResiduoForm((f) => ({ ...f, marDensidade: e.target.value }))} className={inputCls} placeholder="Converte volume (m³/L) em toneladas na emissão" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Número ONU (opcional)</label>
                <input value={residuoForm.marNumeroONU} onChange={(e) => setResiduoForm((f) => ({ ...f, marNumeroONU: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Classe de risco (opcional)</label>
                <input value={residuoForm.marClasseRisco} onChange={(e) => setResiduoForm((f) => ({ ...f, marClasseRisco: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Nome de embarque (opcional)</label>
                <input value={residuoForm.marNomeEmbarque} onChange={(e) => setResiduoForm((f) => ({ ...f, marNomeEmbarque: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Grupo de embalagem (opcional)</label>
                <input value={residuoForm.marGrupoEmbalagem} onChange={(e) => setResiduoForm((f) => ({ ...f, marGrupoEmbalagem: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Código interno (opcional)</label>
                <input value={residuoForm.marCodigoInterno} onChange={(e) => setResiduoForm((f) => ({ ...f, marCodigoInterno: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Descrição interna (opcional)</label>
                <input value={residuoForm.marDescricaoInterna} onChange={(e) => setResiduoForm((f) => ({ ...f, marDescricaoInterna: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Observação (opcional)</label>
                <textarea value={residuoForm.observacoes} onChange={(e) => setResiduoForm((f) => ({ ...f, observacoes: e.target.value }))} className={inputCls} rows={2} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setResiduoModal(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)]">
                Cancelar
              </button>
              <button onClick={salvarResiduo} className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
                <Save size={15} /> {editandoResiduo === null ? "Adicionar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Conexões ----------

function ConexoesTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; onChanged: () => void; toast: ToastFn }) {
  const { conexoes, empreendimentos, onChanged, toast } = props;
  const [form, setForm] = useState({ nome: "", cnpj: "", unidade: "", empreendimentoId: "", token: "", modo: "mock", venceEm: "" });
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  function selecionarEmpreendimento(id: string) {
    const emp = empreendimentos.find((e) => e.id === Number(id));
    if (!emp) return;
    const cnpj = emp.cnpj || emp.cliente.cnpj;
    const razaoSocial = emp.cliente.razaoSocial || `${emp.cliente.apelido} — ${emp.apelido}`;
    setForm((f) => ({
      ...f,
      empreendimentoId: id,
      nome: razaoSocial,
      cnpj: cnpj || f.cnpj,
      unidade: emp.unidadeSinir || f.unidade,
    }));
    toast(emp.unidadeSinir ? `Dados de ${emp.apelido} preenchidos (razão social e unidade do SINIR)` : `Dados de ${emp.apelido} preenchidos — informe a unidade do SINIR`, emp.unidadeSinir ? "success" : "info");
  }

  async function buscarCnpj() {
    if (form.cnpj.replace(/\D/g, "").length !== 14) {
      toast("Informe um CNPJ com 14 dígitos para buscar", "error");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`/api/cnpj/${form.cnpj.replace(/\D/g, "")}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "CNPJ não encontrado", "error");
        return;
      }
      const data = await res.json();
      setForm((f) => ({
        ...f,
        nome: data.razaoSocial || f.nome,
      }));
      toast(`Razão social preenchida: ${data.razaoSocial}`, "success");
    } catch {
      toast("Falha ao buscar o CNPJ", "error");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function salvar() {
    if (!form.nome || !form.cnpj || !form.unidade) {
      toast("Preencha nome, CNPJ e código da unidade", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/sinir/conexoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cnpj: form.cnpj.replace(/\D/g, ""),
          empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
          token: form.token || null,
          modo: form.modo,
          venceEm: form.venceEm || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao salvar", "error");
        return;
      }
      toast(form.modo === "real" ? "Conexão real cadastrada (token criptografado)" : "Conexão de simulação cadastrada", "success");
      setForm({ nome: "", cnpj: "", unidade: "", empreendimentoId: "", token: "", modo: "mock", venceEm: "" });
      onChanged();
    } catch {
      toast("Erro ao salvar conexão", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: number) {
    if (!confirm("Remover esta conexão e seus manifestos?")) return;
    const res = await fetch(`/api/sinir/conexoes?ids=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Conexão removida", "success");
      onChanged();
    }
  }

  async function trocarModo(conexao: Conexao, novoModo: string) {
    const res = await fetch(`/api/sinir/conexoes/${conexao.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo: novoModo }),
    });
    if (res.ok) {
      toast(novoModo === "real" ? "Modo real ativado — o token será usado nas próximas chamadas" : "Modo simulação ativado", "success");
      onChanged();
    } else {
      toast("Falha ao alterar o modo", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Nova conexão</h2>
        <p className="mb-4 text-sm text-[var(--color-ink-500)]">
          Em <b>modo simulação</b> funciona sem token (dados fictícios). Para conversar com o SINIR de verdade, gere o token no portal (Configurações → Gerar Token API WS) e cadastre em <b>modo real</b> — o token fica criptografado.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Vincular empreendimento (preenche automaticamente)</label>
            <select value={form.empreendimentoId} onChange={(e) => selecionarEmpreendimento(e.target.value)} className={inputCls}>
              <option value="">Selecione um empreendimento cadastrado...</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.cliente.apelido} — {e.apelido}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Nome (razão social)</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ</label>
            <div className="flex gap-2">
              <input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
              <button
                onClick={buscarCnpj}
                disabled={buscandoCnpj}
                title="Buscar razão social pelo CNPJ"
                className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)] disabled:opacity-50"
              >
                {buscandoCnpj ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                {buscandoCnpj ? "Buscando..." : "Buscar CNPJ"}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Código da unidade no SINIR</label>
            <input value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} className={inputCls} placeholder="Ex.: 1001" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Modo</label>
            <select value={form.modo} onChange={(e) => setForm((f) => ({ ...f, modo: e.target.value }))} className={inputCls}>
              <option value="mock">Simulação (sem token)</option>
              <option value="real">Real (com token)</option>
            </select>
          </div>
          {form.modo === "real" && (
            <>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Token API WS</label>
                <input value={form.token} onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))} className={inputCls} type="password" placeholder="Cole o token gerado no portal do SINIR" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Vencimento do token</label>
                <input type="date" value={form.venceEm} onChange={(e) => setForm((f) => ({ ...f, venceEm: e.target.value }))} className={inputCls} />
              </div>
            </>
          )}
        </div>
        <button onClick={salvar} disabled={salvando}
          className="focus-ring transition-brand mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          {salvando ? "Salvando..." : "Salvar conexão"}
        </button>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Conexões cadastradas</h2>
        {conexoes.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">Nenhuma conexão cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Nome</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">CNPJ</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Unidade</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Modo</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Token</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Vencimento</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {conexoes.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{c.nome}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{c.cnpj}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{c.unidade}</td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => trocarModo(c, c.modo === "mock" ? "real" : "mock")}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.modo === "mock" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}
                        title="Clique para alternar entre simulação e real"
                      >
                        {c.modo === "mock" ? "simulação" : "real"} — clicar alterna
                      </button>
                    </td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">
                      {c.temToken ? <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 size={12} /> token salvo</span> : <span className="text-xs text-[var(--color-ink-400)]">sem token</span>}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{c.venceEm ? fmtData(c.venceEm) : "—"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => remover(c.id)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover">
                          <Trash2 size={14} />
                        </button>
                        {c._count && c._count.manifestos > 0 && (
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/sinir/manifestos?conexaoId=${c.id}`, { method: "DELETE" });
                              if (res.ok) {
                                toast("Manifestos da conexão removidos", "success");
                                onChanged();
                              }
                            }}
                            className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]"
                            title={`Limpar ${c._count.manifestos} manifesto(s)`}
                          >
                            <FileDown size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}