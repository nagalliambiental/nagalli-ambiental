"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Truck, RefreshCw, Send, Link2, Loader2, CheckCircle2, AlertTriangle, XCircle, FileDown, Trash2, Ban, ShieldCheck, Clock } from "lucide-react";
import { useToast } from "@/components/Toast";

type ToastFn = (message: string, type?: "success" | "error" | "info" | "warning") => void;

type Tab = "painel" | "meusMtrs" | "emitir" | "conexoes";

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
  descricao: string;
  cliente: { id: number; apelido: string; cnpj: string; razaoSocial: string };
}

interface Manifesto {
  id: number;
  numero: string;
  status: string;
  certificado: boolean;
  clienteNome: string | null;
  empreendNome: string | null;
  resumo: string | null;
  quantidade: number | null;
  unidade: string | null;
  dataExpedicao: string | null;
  dataRecebimento: string | null;
  conexao: { id: number; nome: string; modo: string };
}

const STATUS_BADGE: Record<string, string> = {
  CERTIFICADO: "bg-green-50 text-green-700",
  SALVO: "bg-red-50 text-red-700",
  EMITIDO: "bg-blue-50 text-blue-700",
  RECEBIDO: "bg-amber-50 text-amber-700",
  CANCELADO: "bg-red-50 text-red-700",
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
  const [tab, setTab] = useState<Tab>("painel");

  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [manifestos, setManifestos] = useState<Manifesto[]>([]);
  const [manifestosLoading, setManifestosLoading] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOpcao[]>([]);

  const carregarConexoes = useCallback(async () => {
    try {
      const res = await fetch("/api/sinir/conexoes");
      if (res.ok) setConexoes(await res.json());
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
            { key: "conexoes", label: "Conexões" },
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
        <MeusMtrsTab conexoes={conexoes} manifestos={manifestos} loading={manifestosLoading} filtro={filtro} setFiltro={setFiltro} onVerificar={() => carregarManifestos()} toast={toast} />
      )}

      {tab === "emitir" && (
        <EmitirTab conexoes={conexoes} empreendimentos={empreendimentos} onEmitido={() => { carregarManifestos(); carregarConexoes(); }} toast={toast} />
      )}

      {tab === "conexoes" && (
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

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

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

  async function baixarManifesto(m: Manifesto) {
    try {
      const res = await fetch(`/api/sinir/manifestos/${m.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao baixar o PDF", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MTR-${m.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast("Falha ao baixar o PDF", "error");
    }
  }

  async function cancelarManifesto(m: Manifesto) {
    const justificativa = prompt(`Justificativa para cancelar o MTR ${m.numero}:`, "");
    if (justificativa === null || !justificativa.trim()) {
      toast("Cancelamento requerido com justificativa", "error");
      return;
    }
    if (!confirm(`Cancelar o MTR ${m.numero}?`)) return;
    try {
      const res = await fetch("/api/sinir/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: m.conexao.id, numero: m.numero, justificativa: justificativa.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao cancelar", "error");
        return;
      }
      onVerificar();
      toast("MTR cancelado", "success");
    } catch {
      toast("Falha ao cancelar", "error");
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
                            onClick={() => cancelarManifesto(m)}
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
  manifestos: Manifesto[];
  loading: boolean;
  filtro: string;
  setFiltro: (f: string) => void;
  onVerificar: () => void;
  toast: ToastFn;
}) {
  const { conexoes, manifestos, loading, filtro, setFiltro, onVerificar, toast } = props;
  const [conexaoId, setConexaoId] = useState("");
  const [gerandoAlerta, setGerandoAlerta] = useState(false);
  const [consultando, setConsultando] = useState(false);

  const limiteDias = 7;
  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  const salvos = manifestos.filter(
    (m) => (m.status === "SALVO" || m.status === "EMITIDO") && !m.certificado
  );
  const emAtraso = salvos.filter((m) => diasEmSalvo(m) > limiteDias);

  async function consultarSinir() {
    if (!conexaoEfetiva) {
      toast("Selecione uma conexão", "error");
      return;
    }
    setConsultando(true);
    try {
      const res = await fetch("/api/sinir/meus-mtrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: Number(conexaoEfetiva) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao consultar o SINIR", "error");
        return;
      }
      onVerificar();
      toast(`SINIR consultado: ${data.total} MTR(s) nos últimos 30 dias (${data.papeis?.join(", ")})`, "success");
    } catch {
      toast("Falha ao consultar o SINIR", "error");
    } finally {
      setConsultando(false);
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
              Puxa do SINIR todos os MTRs dos últimos 30 dias em que a empresa consta (gerador, transportador, destinador ou armazenador). Situação de cada MTR: <b className="text-green-700">Recebido</b> = tudo ok; <b className="text-red-700">Salvo há mais de {limiteDias} dias</b> = avisar o cliente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={conexaoEfetiva}
              onChange={(e) => setConexaoId(e.target.value)}
              className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
            >
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} {c.modo === "mock" ? "(simulação)" : ""}</option>
              ))}
            </select>
            <button
              onClick={consultarSinir}
              disabled={consultando || conexoes.length === 0}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {consultando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {consultando ? "Consultando..." : "Consultar SINIR (30 dias)"}
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
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Lista de MTRs ({manifestos.length})</h2>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setFiltro("todos")} className={`rounded-full px-3 py-1 font-medium ${filtro === "todos" ? "bg-[var(--color-brand-500)] text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Todos ({manifestos.length})
            </button>
            <button onClick={() => setFiltro("pendentes")} className={`rounded-full px-3 py-1 font-medium ${filtro === "pendentes" ? "bg-amber-500 text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>
              Sem recebimento ({salvos.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--color-brand-500)]" />
          </div>
        ) : manifestos.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-500)]">
            Nenhum MTR ainda. Clique em &quot;Consultar SINIR&quot; para buscar todos os MTRs dos últimos 30 dias (incluindo os emitidos pelos clientes).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left">
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Número</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Cliente</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Empreendimento</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Expedição</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Situação</th>
                  <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {manifestos
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
                        <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.empreendNome || "—"}</td>
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
                              {m.status === "CERTIFICADO" ? "Certificado" : m.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/sinir/manifestos/${m.id}/download`);
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => null);
                                    toast(data?.error || "Falha ao baixar", "error");
                                    return;
                                  }
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `MTR-${m.numero}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch {
                                  toast("Falha ao baixar", "error");
                                }
                              }}
                              title="Baixar PDF do MTR"
                              className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]"
                            >
                              <FileDown size={15} />
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

function EmitirTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; onEmitido: () => void; toast: ToastFn }) {
  const { conexoes, empreendimentos, onEmitido, toast } = props;
  const [form, setForm] = useState({
    conexaoId: "",
    empreendimentoId: "",
    clienteNome: "",
    empreendNome: "",
    resumo: "",
    quantidade: "",
    unidade: "kg",
    transportadorCnpj: "",
    destinadorCnpj: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ numero: string; simulacao: boolean } | null>(null);

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(form.conexaoId)) ? form.conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  function selecionarEmpreendimento(id: string) {
    const emp = empreendimentos.find((e) => e.id === Number(id));
    if (!emp) return;
    const cnpj = emp.cnpj || emp.cliente.cnpj;
    setForm((f) => ({
      ...f,
      empreendimentoId: id,
      clienteNome: emp.cliente.apelido,
      empreendNome: emp.apelido,
      resumo: emp.descricao ? `Resíduo — ${emp.descricao}` : f.resumo,
      transportadorCnpj: cnpj || f.transportadorCnpj,
      destinadorCnpj: cnpj || f.destinadorCnpj,
    }));
    toast(`Empreendimento ${emp.apelido} preenchido automaticamente (CNPJ ${cnpj || "não informado"})`, "info");
  }

  async function emitir() {
    if (!form.resumo || !form.quantidade || form.transportadorCnpj.length !== 14 || form.destinadorCnpj.length !== 14) {
      toast("Preencha resumo, quantidade e CNPJs (14 dígitos) do transportador e destinador", "error");
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/sinir/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, conexaoId: Number(conexaoEfetiva), quantidade: Number(form.quantidade) }),
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

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      <h2 className="font-display mb-1 text-base font-semibold text-[var(--color-ink-900)]">Emitir Manifesto (MTR)</h2>
      <p className="mb-4 text-sm text-[var(--color-ink-500)]">Em modo simulação gera um MTR fictício. Em modo real envia ao SINIR com o token da conexão.</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Empreendimento (preenche automaticamente)</label>
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Unidade de medida</label>
          <select value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} className={inputCls}>
            <option value="kg">kg</option>
            <option value="t">t</option>
            <option value="m3">m³</option>
            <option value="L">L</option>
            <option value="un">un</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Cliente (gerador)</label>
          <input value={form.clienteNome} onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value }))} className={inputCls} placeholder="Nome do cliente" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Empreendimento</label>
          <input value={form.empreendNome} onChange={(e) => setForm((f) => ({ ...f, empreendNome: e.target.value }))} className={inputCls} placeholder="Nome do empreendimento" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Resumo dos resíduos</label>
          <input value={form.resumo} onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))} className={inputCls} placeholder="Ex.: Resíduo classe II — entulho de obra" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">Quantidade</label>
          <input type="number" step="0.01" value={form.quantidade} onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ transportador (14 dígitos)</label>
          <input value={form.transportadorCnpj} onChange={(e) => setForm((f) => ({ ...f, transportadorCnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ destinador (14 dígitos)</label>
          <input value={form.destinadorCnpj} onChange={(e) => setForm((f) => ({ ...f, destinadorCnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
        </div>
      </div>

      <button onClick={emitir} disabled={enviando || conexoes.length === 0}
        className="focus-ring transition-brand mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
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
    </div>
  );
}

// ---------- Conexões ----------

function ConexoesTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; onChanged: () => void; toast: ToastFn }) {
  const { conexoes, empreendimentos, onChanged, toast } = props;
  const [form, setForm] = useState({ nome: "", cnpj: "", unidade: "", empreendimentoId: "", token: "", modo: "mock", venceEm: "" });
  const [salvando, setSalvando] = useState(false);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  function selecionarEmpreendimento(id: string) {
    const emp = empreendimentos.find((e) => e.id === Number(id));
    if (!emp) return;
    const cnpj = emp.cnpj || emp.cliente.cnpj;
    setForm((f) => ({
      ...f,
      empreendimentoId: id,
      nome: `${emp.cliente.apelido} — ${emp.apelido}`,
      cnpj: cnpj || f.cnpj,
      unidade: emp.apelido,
    }));
    toast(`Dados de ${emp.apelido} preenchidos (edite se necessário)`, "info");
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
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Nome (ex.: Cliente X — Unidade Y)</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">CNPJ</label>
            <input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Código da unidade</label>
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