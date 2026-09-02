"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/Topbar";
import { Truck, RefreshCw, Send, Link2, Loader2, CheckCircle2, FileDown, Trash2, Ban, Plus, X, PackagePlus, FileText } from "lucide-react";
import { useToast } from "@/components/Toast";

type ToastFn = (message: string, type?: "success" | "error" | "info" | "warning") => void;

type Tab = "painel" | "meusMtrs" | "emitir" | "conexoes";
const POR_PAGINA = 15;

interface Conexao {
  id: number;
  nome: string;
  cnpj: string;
  cpf: string;
  unidade: number | null;
  empreendimentoId: number | null;
  ativo: boolean;
  ultimoUsoEm: string | null;
  temSenha: boolean;
  _count?: { manifestos: number };
  empreendimento?: { id: number; apelido: string } | null;
}

interface EmpreendimentoOpcao {
  id: number;
  apelido: string;
  cnpj: string | null;
  descricao: string;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  complemento: string | null;
  cliente: { id: number; apelido: string; cnpj: string; razaoSocial: string };
}

interface Manifesto {
  id: number;
  numero: string;
  status: string;
  clienteNome: string | null;
  empreendNome: string | null;
  transportadorNome: string | null;
  destinadorNome: string | null;
  resumo: string | null;
  quantidade: number | null;
  unidade: string | null;
  dataExpedicao: string | null;
  dataRecebimento: string | null;
  classeRisco: string | null;
  classeNome: string | null;
  conexao: { id: number; nome: string };
}

interface MtrImaCatalogosFront {
  unidades: { codigo: number; nome: string; sigla: string }[];
  estadosFisicos: { codigo: number; descricao: string }[];
  classes: { codigo: number; descricao: string }[];
  acondicionamentos: { codigo: number; descricao: string }[];
  tratamentos: { codigo: number; descricao: string }[];
}

interface ResiduoForm {
  residuo: string;
  quantidade: string;
  codigoUnidade: string;
  codigoTipoEstado: string;
  codigoClasse: string;
  codigoAcondicionamento: string;
  codigoTecnologia: string;
  numeroONU: string;
  classeDeRisco: string;
  nomeEmbarque: string;
  grupoEmbalagem: string;
}

const emptyResiduo: ResiduoForm = {
  residuo: "",
  quantidade: "",
  codigoUnidade: "2",
  codigoTipoEstado: "1",
  codigoClasse: "1",
  codigoAcondicionamento: "1",
  codigoTecnologia: "1",
  numeroONU: "",
  classeDeRisco: "",
  nomeEmbarque: "",
  grupoEmbalagem: "",
};

const STATUS_BADGE: Record<string, string> = {
  EMITIDO: "bg-blue-50 text-blue-700",
  RECEBIDO: "bg-green-50 text-green-700",
  CANCELADO: "bg-red-50 text-red-700",
  PENDENTE: "bg-amber-50 text-amber-700",
};

function fmtData(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR");
}

export default function MtrImaPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const perfil = (session?.user as Record<string, unknown> | undefined)?.perfil as string | undefined;
  const ehPrivilegiado = perfil === "socio" || perfil === "admin";
  const [tab, setTab] = useState<Tab>("painel");

  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [manifestos, setManifestos] = useState<Manifesto[]>([]);
  const [manifestosLoading, setManifestosLoading] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOpcao[]>([]);

  const carregarConexoes = useCallback(async () => {
    try {
      const res = await fetch("/api/mtr-ima/conexoes");
      if (res.ok) setConexoes(await res.json());
    } catch {
      // silencioso
    }
  }, []);

  const carregarManifestos = useCallback(async () => {
    setManifestosLoading(true);
    try {
      const res = await fetch("/api/mtr-ima/manifestos");
      if (res.ok) setManifestos(await res.json());
    } catch {
      setManifestos([]);
    } finally {
      setManifestosLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/mtr-ima/conexoes", { signal: controller.signal });
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
        const res = await fetch("/api/empreendimentos", { signal: controller.signal });
        if (res.ok) setEmpreendimentos(await res.json());
      } catch {
        if (!controller.signal.aborted) setEmpreendimentos([]);
      }
    })();
    return () => controller.abort();
  }, []);

  const emitidos = manifestos.filter((m) => m.status === "EMITIDO").length;
  const recebidos = manifestos.filter((m) => m.status === "RECEBIDO").length;
  const cancelados = manifestos.filter((m) => m.status === "CANCELADO").length;

  return (
    <div>
      <Topbar
        icon={Truck}
        title="MTR IMA/SC"
        subtitle="Manifesto de Transporte de Resíduos — Sistema IMA/SC (Santa Catarina)"
      />

      <div className="mb-4 flex gap-1 border-b border-[var(--color-paper-200)]">
        {(
          [
            { key: "painel", label: "Painel" },
            { key: "meusMtrs", label: "Meus MTRs" },
            { key: "emitir", label: "Emitir MTR" },
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
          manifestos={manifestos}
          loading={manifestosLoading}
          emitidos={emitidos}
          recebidos={recebidos}
          cancelados={cancelados}
          onVerificar={() => carregarManifestos()}
          toast={toast}
        />
      )}

      {tab === "meusMtrs" && (
        <MeusMtrsTab conexoes={conexoes} toast={toast} />
      )}

      {tab === "emitir" && (
        <EmitirTab
          conexoes={conexoes}
          empreendimentos={empreendimentos}
          onEmitido={() => { carregarManifestos(); carregarConexoes(); }}
          toast={toast}
        />
      )}

      {tab === "conexoes" && ehPrivilegiado && (
        <ConexoesTab conexoes={conexoes} empreendimentos={empreendimentos} onChanged={() => carregarConexoes()} toast={toast} />
      )}
    </div>
  );
}

/* ════════════════ PAINEL ════════════════ */

function PainelTab(props: {
  conexoes: Conexao[];
  manifestos: Manifesto[];
  loading: boolean;
  emitidos: number;
  recebidos: number;
  cancelados: number;
  onVerificar: () => void;
  toast: ToastFn;
}) {
  const { conexoes, manifestos, loading, emitidos, recebidos, cancelados, onVerificar, toast } = props;
  const [conexaoId, setConexaoId] = useState("");
  const [numero, setNumero] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Manifesto | null>(null);
  const [paginaManifestos, setPaginaManifestos] = useState(0);
  const totalPaginasM = Math.max(1, Math.ceil(manifestos.length / POR_PAGINA));
  const paginaM = Math.min(paginaManifestos, totalPaginasM - 1);
  const visiveisM = manifestos.slice(paginaM * POR_PAGINA, paginaM * POR_PAGINA + POR_PAGINA);
  const [modalCancel, setModalCancel] = useState<Manifesto | null>(null);
  const [justificativaCancel, setJustificativaCancel] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  async function consultar() {
    if (!conexaoEfetiva || !numero.trim()) {
      toast("Selecione a conexão e informe o n.º do MTR", "error");
      return;
    }
    setConsultando(true);
    try {
      const res = await fetch("/api/mtr-ima/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: Number(conexaoEfetiva), numero: numero.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao consultar", "error");
        return;
      }
      setResultado(data as Manifesto);
      toast("MTR consultado com sucesso", "success");
    } catch {
      toast("Erro ao consultar MTR", "error");
    } finally {
      setConsultando(false);
    }
  }

  async function cancelar() {
    if (!modalCancel) return;
    if (!justificativaCancel.trim()) {
      toast("Informe a justificativa do cancelamento", "error");
      return;
    }
    setCancelando(true);
    try {
      const res = await fetch("/api/mtr-ima/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: modalCancel.conexao.id, numero: modalCancel.numero, justificativa: justificativaCancel }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao cancelar", "error");
        return;
      }
      toast(data.mensagem || "MTR cancelado", "success");
      setModalCancel(null);
      setJustificativaCancel("");
      onVerificar();
    } catch {
      toast("Erro ao cancelar", "error");
    } finally {
      setCancelando(false);
    }
  }

  async function baixarPdf(m: Manifesto) {
    try {
      const res = await fetch(`/api/mtr-ima/manifestos/${m.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao baixar PDF", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MTR-IMA-${m.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast("Falha ao baixar PDF", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Emitidos", valor: emitidos, cor: "text-blue-700 bg-blue-50" },
          { label: "Recebidos", valor: recebidos, cor: "text-green-700 bg-green-50" },
          { label: "Cancelados", valor: cancelados, cor: "text-red-700 bg-red-50" },
          { label: "Total", valor: manifestos.length, cor: "text-[var(--color-ink-700)] bg-[var(--color-paper-100)]" },
        ].map((c) => (
          <div key={c.label} className={`shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5`}>
            <div className={`mb-2 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${c.cor}`}>{c.label}</div>
            <p className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Consultar MTR</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Conexão</label>
            <select value={conexaoEfetiva} onChange={(e) => setConexaoId(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Selecione...</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">N.º do MTR</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" placeholder="Ex.: 1711000811" />
          </div>
          <button onClick={consultar} disabled={consultando} className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
            {consultando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {consultando ? "Consultando..." : "Consultar"}
          </button>
        </div>
        {resultado && (
          <div className="mt-4 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4 text-sm">
            <p className="font-semibold text-[var(--color-ink-900)]">MTR {resultado.numero}</p>
            <p className="mt-1 text-[var(--color-ink-600)]">Status: {resultado.status}</p>
            {resultado.clienteNome && <p className="text-[var(--color-ink-600)]">Gerador: {resultado.clienteNome}</p>}
            {resultado.transportadorNome && <p className="text-[var(--color-ink-600)]">Transportador: {resultado.transportadorNome}</p>}
            {resultado.destinadorNome && <p className="text-[var(--color-ink-600)]">Destinador: {resultado.destinadorNome}</p>}
            {resultado.quantidade != null && <p className="text-[var(--color-ink-600)]">Quantidade: {resultado.quantidade}</p>}
            {resultado.resumo && <p className="text-[var(--color-ink-600)]">Obs.: {resultado.resumo}</p>}
          </div>
        )}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Manifestos</h2>
          <button onClick={onVerificar} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)]">
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]"><Loader2 size={16} className="mr-2 inline animate-spin" />Carregando...</p>
        ) : visiveisM.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">Nenhum manifesto cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">N.º</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Conexão</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Destinador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Expedição</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Qtd</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Status</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveisM.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{m.numero}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.conexao.nome}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.destinadorNome || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{fmtData(m.dataExpedicao)}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.quantidade != null ? m.quantidade : "—"}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>{m.status}</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => baixarPdf(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Baixar PDF"><FileDown size={14} /></button>
                        {m.status !== "CANCELADO" && (
                          <button onClick={() => setModalCancel(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Cancelar"><Ban size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-500)]">
              <span>{manifestos.length} registro(s) — Página {paginaM + 1} de {totalPaginasM}</span>
              <div className="flex gap-2">
                <button disabled={paginaM === 0} onClick={() => setPaginaManifestos((p) => p - 1)} className="rounded px-2 py-1 disabled:opacity-40">Anterior</button>
                <button disabled={paginaM === totalPaginasM - 1} onClick={() => setPaginaManifestos((p) => p + 1)} className="rounded px-2 py-1 disabled:opacity-40">Próxima</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalCancel(null)}>
          <div className="shadow-card w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display mb-3 font-semibold text-[var(--color-ink-900)]">Cancelar MTR {modalCancel.numero}</h3>
            <textarea value={justificativaCancel} onChange={(e) => setJustificativaCancel(e.target.value)} rows={4} placeholder="Justificativa do cancelamento..." className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalCancel(null)} className="rounded-lg bg-[var(--color-paper-100)] px-4 py-2 text-sm text-[var(--color-ink-700)]">Voltar</button>
              <button onClick={cancelar} disabled={cancelando} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {cancelando ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════ MEUS MTRs ════════════════ */

function MeusMtrsTab(props: { conexoes: Conexao[]; toast: ToastFn }) {
  const { conexoes, toast } = props;
  const [conexaoId, setConexaoId] = useState("");
  const [numero, setNumero] = useState("");
  const [manifestos, setManifestos] = useState<Manifesto[]>([]);
  const [carregando, setCarregando] = useState(false);

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  async function consultar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/mtr-ima/meus-mtrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: conexaoEfetiva ? Number(conexaoEfetiva) : undefined, numero: numero.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Falha ao consultar", "error");
        return;
      }
      setManifestos(await res.json());
    } catch {
      toast("Erro ao consultar", "error");
    } finally {
      setCarregando(false);
    }
  }

  async function baixarPdf(m: Manifesto) {
    try {
      const res = await fetch(`/api/mtr-ima/manifestos/${m.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao baixar PDF", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MTR-IMA-${m.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast("Falha ao baixar PDF", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Consultar MTRs</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Conexão</label>
            <select value={conexaoEfetiva} onChange={(e) => setConexaoId(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Todas</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">N.º (opcional)</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" placeholder="Filtrar por n.º" />
          </div>
          <button onClick={consultar} disabled={carregando} className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
            {carregando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {carregando ? "Consultando..." : "Consultar"}
          </button>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Resultado</h2>
        {manifestos.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">{carregando ? "Carregando..." : "Nenhum manifesto encontrado."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">N.º</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Conexão</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Transportador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Destinador</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Expedição</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Recebimento</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Qtd</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Status</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">PDF</th>
                </tr>
              </thead>
              <tbody>
                {manifestos.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{m.numero}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.conexao.nome}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.transportadorNome || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.destinadorNome || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{fmtData(m.dataExpedicao)}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{fmtData(m.dataRecebimento)}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.quantidade != null ? m.quantidade : "—"}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>{m.status}</span>
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => baixarPdf(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Baixar PDF"><FileDown size={14} /></button>
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

/* ════════════════ EMITIR ════════════════ */

function EmitirTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; onEmitido: () => void; toast: ToastFn }) {
  const { conexoes, empreendimentos, onEmitido, toast } = props;
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
    cnpGerador: "",
    codUnidadeGerador: "",
    cnpTransportador: "",
    codUnidadeTransportador: "",
    transportadorNome: "",
    cnpDestinador: "",
    codUnidadeDestinador: "",
    destinadorNome: "",
    manifGeradorNomeResponsavel: "",
    manifGeradorCargoResponsavel: "",
    manifTransportadorNomeMotorista: "",
    manifTransportadorPlacaVeiculo: "",
    manifTransportadorDataExpedicao: "",
    seuCodigoReferencia: "",
    observacoes: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ numero: string; codigoBarra?: string } | null>(null);
  const [residuos, setResiduos] = useState<ResiduoForm[]>([]);
  const [catalogos, setCatalogos] = useState<MtrImaCatalogosFront | null>(null);
  const [modalResiduo, setModalResiduo] = useState(false);
  const [editandoResiduo, setEditandoResiduo] = useState<number | null>(null);
  const [residuoForm, setResiduoForm] = useState<ResiduoForm>(emptyResiduo);

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(form.conexaoId)) ? form.conexaoId : conexoes.length ? String(conexoes[0].id) : "";
  const responsavel = form.manifGeradorNomeResponsavel || nomeUsuario;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/mtr-ima/catalogos", { signal: controller.signal });
        if (res.ok) setCatalogos(await res.json());
      } catch {
        if (!controller.signal.aborted) setCatalogos(null);
      }
    })();
    return () => controller.abort();
  }, []);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
  const labelCls = "text-xs font-medium text-[var(--color-ink-500)]";

  function selecionarEmpreendimento(id: string) {
    const emp = empreendimentos.find((e) => e.id === Number(id));
    if (!emp) return;
    const cnpj = emp.cnpj || emp.cliente.cnpj;
    setForm((f) => ({
      ...f,
      empreendimentoId: id,
      clienteNome: emp.cliente.razaoSocial || emp.cliente.apelido,
      empreendNome: emp.apelido,
      cnpGerador: cnpj || f.cnpGerador,
      resumo: emp.descricao ? `Resíduo — ${emp.descricao}` : f.resumo,
    }));
    toast(`Empreendimento ${emp.apelido} preenchido (CNPJ do gerador)`, "success");
  }

  function adicionarResiduo() {
    if (!residuoForm.residuo || !residuoForm.quantidade || Number(residuoForm.quantidade) <= 0) {
      toast("Informe o código IBAMA e a quantidade do resíduo", "error");
      return;
    }
    if (editandoResiduo != null) {
      setResiduos((rs) => rs.map((r, i) => (i === editandoResiduo ? residuoForm : r)));
      setEditandoResiduo(null);
    } else {
      setResiduos((rs) => [...rs, residuoForm]);
    }
    setResiduoForm(emptyResiduo);
    setModalResiduo(false);
  }

  async function emitir() {
    if (!conexaoEfetiva) {
      toast("Selecione a conexão", "error");
      return;
    }
    if (!form.cnpTransportador || form.cnpTransportador.replace(/\D/g, "").length !== 14 || !form.cnpDestinador || form.cnpDestinador.replace(/\D/g, "").length !== 14) {
      toast("Preencha os CNPJs (14 dígitos) do transportador e destinador", "error");
      return;
    }
    if (residuos.length === 0) {
      toast("Adicione pelo menos um resíduo", "error");
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const itens = residuos.map((r, i) => ({
        codigoSequencial: i + 1,
        residuo: r.residuo.replace(/\D/g, ""),
        quantidade: Number(r.quantidade),
        codigoUnidade: Number(r.codigoUnidade),
        codigoTipoEstado: Number(r.codigoTipoEstado),
        codigoClasse: Number(r.codigoClasse),
        codigoAcondicionamento: Number(r.codigoAcondicionamento),
        codigoTecnologia: Number(r.codigoTecnologia),
        numeroONU: r.numeroONU || undefined,
        classeDeRisco: r.classeDeRisco || undefined,
        nomeEmbarque: r.nomeEmbarque || undefined,
        grupoEmbalagem: r.grupoEmbalagem || undefined,
      }));
      const quantidadeTotal = residuos.reduce((s, r) => s + Number(r.quantidade), 0);
      const resumo = residuos.map((r) => r.residuo).join("; ") || form.resumo;
      const transporteNome = form.transportadorNome || form.cnpTransportador;

      const res = await fetch("/api/mtr-ima/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conexaoId: Number(conexaoEfetiva),
          clienteNome: form.clienteNome || undefined,
          empreendNome: form.empreendNome || undefined,
          resumo,
          quantidade: quantidadeTotal,
          unidade: form.unidade,
          transportadorNome: transporteNome,
          destinadorNome: form.destinadorNome || undefined,
          cnpGerador: form.cnpGerador.replace(/\D/g, ""),
          cnpTransportador: form.cnpTransportador.replace(/\D/g, ""),
          cnpDestinador: form.cnpDestinador.replace(/\D/g, ""),
          codUnidadeGerador: form.codUnidadeGerador ? Number(form.codUnidadeGerador) : undefined,
          codUnidadeTransportador: form.codUnidadeTransportador ? Number(form.codUnidadeTransportador) : undefined,
          codUnidadeDestinador: form.codUnidadeDestinador ? Number(form.codUnidadeDestinador) : undefined,
          manifGeradorNomeResponsavel: responsavel,
          manifGeradorCargoResponsavel: form.manifGeradorCargoResponsavel || undefined,
          manifTransportadorNomeMotorista: form.manifTransportadorNomeMotorista || undefined,
          manifTransportadorPlacaVeiculo: form.manifTransportadorPlacaVeiculo || undefined,
          manifTransportadorDataExpedicao: form.manifTransportadorDataExpedicao || undefined,
          seuCodigoReferencia: form.seuCodigoReferencia || undefined,
          manifObservacao: form.observacoes || undefined,
          itens,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao emitir", "error");
        return;
      }
      setResultado(data);
      onEmitido();
      toast(`MTR ${data.numero} emitido no IMA/SC`, "success");
    } catch {
      toast("Erro ao emitir MTR", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Dados da emissão</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelCls}>Conexão MTR-IMA/SC</label>
            <select value={conexaoEfetiva} onChange={(e) => setForm((f) => ({ ...f, conexaoId: e.target.value }))} className={inputCls}>
              <option value="">Selecione...</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelCls}>Vincular empreendimento (preenche gerador)</label>
            <select value={form.empreendimentoId} onChange={(e) => selecionarEmpreendimento(e.target.value)} className={inputCls}>
              <option value="">Selecione um empreendimento...</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.cliente.apelido} — {e.apelido}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CNPJ Gerador</label>
            <input value={form.cnpGerador} onChange={(e) => setForm((f) => ({ ...f, cnpGerador: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Unidade Gerador (código)</label>
            <input value={form.codUnidadeGerador} onChange={(e) => setForm((f) => ({ ...f, codUnidadeGerador: e.target.value }))} className={inputCls} placeholder="Ex.: 1001" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nome do responsável</label>
            <input value={responsavel} onChange={(e) => setForm((f) => ({ ...f, manifGeradorNomeResponsavel: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Cargo do responsável</label>
            <input value={form.manifGeradorCargoResponsavel} onChange={(e) => setForm((f) => ({ ...f, manifGeradorCargoResponsavel: e.target.value }))} className={inputCls} placeholder="Ex.: Responsável Técnico" />
          </div>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Transportador</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CNPJ</label>
            <input value={form.cnpTransportador} onChange={(e) => setForm((f) => ({ ...f, cnpTransportador: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Unidade (código)</label>
            <input value={form.codUnidadeTransportador} onChange={(e) => setForm((f) => ({ ...f, codUnidadeTransportador: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nome</label>
            <input value={form.transportadorNome} onChange={(e) => setForm((f) => ({ ...f, transportadorNome: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Motorista</label>
            <input value={form.manifTransportadorNomeMotorista} onChange={(e) => setForm((f) => ({ ...f, manifTransportadorNomeMotorista: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Placa do veículo</label>
            <input value={form.manifTransportadorPlacaVeiculo} onChange={(e) => setForm((f) => ({ ...f, manifTransportadorPlacaVeiculo: e.target.value.toUpperCase() }))} className={inputCls} placeholder="ABC1D23" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Data de expedição</label>
            <input type="date" value={form.manifTransportadorDataExpedicao} onChange={(e) => setForm((f) => ({ ...f, manifTransportadorDataExpedicao: e.target.value }))} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Destinador</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CNPJ</label>
            <input value={form.cnpDestinador} onChange={(e) => setForm((f) => ({ ...f, cnpDestinador: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Unidade (código)</label>
            <input value={form.codUnidadeDestinador} onChange={(e) => setForm((f) => ({ ...f, codUnidadeDestinador: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nome</label>
            <input value={form.destinadorNome} onChange={(e) => setForm((f) => ({ ...f, destinadorNome: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Código de referência interno</label>
            <input value={form.seuCodigoReferencia} onChange={(e) => setForm((f) => ({ ...f, seuCodigoReferencia: e.target.value }))} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Resíduos ({residuos.length})</h2>
          <button onClick={() => { setEditandoResiduo(null); setResiduoForm(emptyResiduo); setModalResiduo(true); }} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
            <Plus size={15} /> Adicionar resíduo
          </button>
        </div>
        {residuos.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">Nenhum resíduo adicionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">IBAMA</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Quantidade</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Unidade</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Classe</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {residuos.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{r.residuo}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{r.quantidade}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.unidades.find((u) => u.codigo === Number(r.codigoUnidade))?.nome || r.codigoUnidade}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.classes.find((c) => c.codigo === Number(r.codigoClasse))?.descricao || r.codigoClasse}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditandoResiduo(i); setResiduoForm(r); setModalResiduo(true); }} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Editar"><X size={14} /></button>
                        <button onClick={() => setResiduos((rs) => rs.filter((_, j) => j !== i))} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-ink-500)]">Responsável: <span className="font-medium text-[var(--color-ink-700)]">{responsavel || "—"}</span></p>
        <button onClick={emitir} disabled={enviando} className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {enviando ? "Emitindo..." : "Emitir MTR"}
        </button>
      </div>

      {resultado && (
        <div className="shadow-card rounded-[var(--radius-card)] border border-green-200 bg-green-50 p-5">
          <p className="flex items-center gap-2 font-semibold text-green-800"><CheckCircle2 size={18} /> MTR emitido com sucesso</p>
          <p className="mt-1 text-sm text-green-700">N.º: <span className="font-semibold">{resultado.numero}</span></p>
          {resultado.codigoBarra && <p className="text-sm text-green-700">Código de barras: {resultado.codigoBarra}</p>}
          <button onClick={() => setResultado(null)} className="mt-3 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white">Fechar</button>
        </div>
      )}

      {modalResiduo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalResiduo(false)}>
          <div className="shadow-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display mb-3 font-semibold text-[var(--color-ink-900)]">{editandoResiduo != null ? "Editar resíduo" : "Novo resíduo"}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Código IBAMA do resíduo</label>
                <input value={residuoForm.residuo} onChange={(e) => setResiduoForm((r) => ({ ...r, residuo: e.target.value }))} className={inputCls} placeholder="Ex.: 170904" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Quantidade</label>
                <input type="number" value={residuoForm.quantidade} onChange={(e) => setResiduoForm((r) => ({ ...r, quantidade: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Unidade</label>
                <select value={residuoForm.codigoUnidade} onChange={(e) => setResiduoForm((r) => ({ ...r, codigoUnidade: e.target.value }))} className={inputCls}>
                  {catalogos?.unidades.map((u) => (
                    <option key={u.codigo} value={u.codigo}>{u.nome} ({u.sigla})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Estado físico</label>
                <select value={residuoForm.codigoTipoEstado} onChange={(e) => setResiduoForm((r) => ({ ...r, codigoTipoEstado: e.target.value }))} className={inputCls}>
                  {catalogos?.estadosFisicos.map((e) => (
                    <option key={e.codigo} value={e.codigo}>{e.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Classe</label>
                <select value={residuoForm.codigoClasse} onChange={(e) => setResiduoForm((r) => ({ ...r, codigoClasse: e.target.value }))} className={inputCls}>
                  {catalogos?.classes.map((c) => (
                    <option key={c.codigo} value={c.codigo}>{c.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Acondicionamento</label>
                <select value={residuoForm.codigoAcondicionamento} onChange={(e) => setResiduoForm((r) => ({ ...r, codigoAcondicionamento: e.target.value }))} className={inputCls}>
                  {catalogos?.acondicionamentos.map((a) => (
                    <option key={a.codigo} value={a.codigo}>{a.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Tecnologia de tratamento</label>
                <select value={residuoForm.codigoTecnologia} onChange={(e) => setResiduoForm((r) => ({ ...r, codigoTecnologia: e.target.value }))} className={inputCls}>
                  {catalogos?.tratamentos.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>N.º ONU (opcional)</label>
                <input value={residuoForm.numeroONU} onChange={(e) => setResiduoForm((r) => ({ ...r, numeroONU: e.target.value }))} className={inputCls} placeholder="Ex.: 3082" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Classe de risco (opcional)</label>
                <input value={residuoForm.classeDeRisco} onChange={(e) => setResiduoForm((r) => ({ ...r, classeDeRisco: e.target.value }))} className={inputCls} placeholder="Ex.: 3" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Nome de embarque (opcional)</label>
                <input value={residuoForm.nomeEmbarque} onChange={(e) => setResiduoForm((r) => ({ ...r, nomeEmbarque: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Grupo de embalagem (opcional)</label>
                <input value={residuoForm.grupoEmbalagem} onChange={(e) => setResiduoForm((r) => ({ ...r, grupoEmbalagem: e.target.value }))} className={inputCls} placeholder="Ex.: III" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalResiduo(false)} className="rounded-lg bg-[var(--color-paper-100)] px-4 py-2 text-sm text-[var(--color-ink-700)]">Cancelar</button>
              <button onClick={adicionarResiduo} className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white">
                <PackagePlus size={16} /> {editandoResiduo != null ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════ CONEXÕES ════════════════ */

function ConexoesTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; onChanged: () => void; toast: ToastFn }) {
  const { conexoes, empreendimentos, onChanged, toast } = props;
  const [form, setForm] = useState({ nome: "", cnpj: "", cpf: "", unidade: "", empreendimentoId: "", senha: "" });
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
  const labelCls = "text-xs font-medium text-[var(--color-ink-500)]";

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
    }));
    toast(`Dados de ${emp.apelido} preenchidos`, "success");
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
      setForm((f) => ({ ...f, nome: data.razaoSocial || f.nome }));
      toast(`Razão social preenchida: ${data.razaoSocial}`, "success");
    } catch {
      toast("Falha ao buscar o CNPJ", "error");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function salvar() {
    if (!form.nome || !form.cnpj || !form.cpf || !form.senha) {
      toast("Preencha nome, CNPJ, CPF e senha", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/mtr-ima/conexoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          cnpj: form.cnpj.replace(/\D/g, ""),
          cpf: form.cpf.replace(/\D/g, ""),
          senha: form.senha,
          unidade: form.unidade ? Number(form.unidade) : null,
          empreendimentoId: form.empreendimentoId ? Number(form.empreendimentoId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao salvar", "error");
        return;
      }
      toast("Conexão MTR-IMA/SC cadastrada (senha criptografada)", "success");
      setForm({ nome: "", cnpj: "", cpf: "", unidade: "", empreendimentoId: "", senha: "" });
      onChanged();
    } catch {
      toast("Erro ao salvar conexão", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: number) {
    if (!confirm("Remover esta conexão e seus manifestos?")) return;
    const res = await fetch(`/api/mtr-ima/conexoes?ids=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Conexão removida", "success");
      onChanged();
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Nova conexão</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelCls}>Vincular empreendimento (preenche automaticamente)</label>
            <select value={form.empreendimentoId} onChange={(e) => selecionarEmpreendimento(e.target.value)} className={inputCls}>
              <option value="">Selecione um empreendimento cadastrado...</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.cliente.apelido} — {e.apelido}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nome (razão social)</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CNPJ</label>
            <div className="flex gap-2">
              <input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
              <button onClick={buscarCnpj} disabled={buscandoCnpj} title="Buscar razão social pelo CNPJ" className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)] disabled:opacity-50">
                {buscandoCnpj ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CPF do usuário (login)</label>
            <input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Código da unidade (opcional)</label>
            <input value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} className={inputCls} placeholder="Ex.: 1001" />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelCls}>Senha de acesso</label>
            <input value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} className={inputCls} type="password" placeholder="Senha do portal MTR IMA/SC" />
          </div>
        </div>
        <button onClick={salvar} disabled={salvando} className="focus-ring transition-brand mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
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
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">CPF</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Unidade</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Senha</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {conexoes.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{c.nome}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{c.cnpj}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{c.cpf}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{c.unidade || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">
                      <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 size={12} /> {c.temSenha ? "salva" : "sem senha"}</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => remover(c.id)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover"><Trash2 size={14} /></button>
                        {c._count && c._count.manifestos > 0 && (
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/mtr-ima/conexoes/${c.id}?limpar=manifestos`, { method: "DELETE" });
                              if (res.ok) {
                                toast("Manifestos da conexão removidos", "success");
                                onChanged();
                              }
                            }}
                            className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]"
                            title={`Limpar ${c._count.manifestos} manifesto(s)`}
                          >
                            <FileText size={14} />
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
