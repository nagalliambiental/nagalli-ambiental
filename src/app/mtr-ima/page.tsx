"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/Topbar";
import { Truck, RefreshCw, Send, Link2, Loader2, CheckCircle2, FileDown, Trash2, Ban, Plus, X, PackagePlus, PackageCheck, FileText, Save, Pencil } from "lucide-react";
import { useToast } from "@/components/Toast";

type ToastFn = (message: string, type?: "success" | "error" | "info" | "warning") => void;

type Tab = "meusMtrs" | "emitir" | "modelos" | "conexoes";
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
  conexao: { id: number; nome: string; unidade: number | null };
}

interface ResiduoModelo {
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

interface ModeloMtrIma {
  id: number;
  conexaoId: number | null;
  codigoPortal: number | null;
  nome: string;
  descricao: string | null;
  clienteNome: string | null;
  empreendNome: string | null;
  nomeResponsavel: string | null;
  cargoResponsavel: string | null;
  transportadorCnpj: string | null;
  transportadorUnidade: number | null;
  transportadorNome: string | null;
  destinadorCnpj: string | null;
  destinadorUnidade: number | null;
  destinadorNome: string | null;
  armazenadorCnpj: string | null;
  armazenadorNome: string | null;
  nomeMotorista: string | null;
  placaVeiculo: string | null;
  observacoes: string | null;
  residuos: ResiduoModelo[];
  conexao: { id: number; nome: string; unidade: number | null } | null;
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
  codigoUnidade: "3",
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

function isoHoje(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtIso(v: string) {
  return v.split("-").reverse().join("/");
}

function haDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return isoHoje(d);
}

export default function MtrImaPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const perfil = (session?.user as Record<string, unknown> | undefined)?.perfil as string | undefined;
  const ehPrivilegiado = perfil === "socio" || perfil === "admin";
  const [tab, setTab] = useState<Tab>("meusMtrs");

  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOpcao[]>([]);
  const [modelos, setModelos] = useState<ModeloMtrIma[]>([]);

  const carregarConexoes = useCallback(async () => {
    try {
      const res = await fetch("/api/mtr-ima/conexoes");
      if (res.ok) setConexoes(await res.json());
    } catch {
      // silencioso
    }
  }, []);

  const carregarModelos = useCallback(async () => {
    try {
      const res = await fetch("/api/mtr-ima/modelos");
      if (res.ok) setModelos(await res.json());
    } catch {
      // silencioso
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
        const res = await fetch("/api/mtr-ima/modelos", { signal: controller.signal });
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

      {tab === "meusMtrs" && (
        <MeusMtrsTab conexoes={conexoes} toast={toast} onChanged={() => { carregarConexoes(); }} />
      )}

      {tab === "emitir" && (
        <EmitirTab
          conexoes={conexoes}
          empreendimentos={empreendimentos}
          modelos={modelos}
          onEmitido={() => { carregarConexoes(); }}
          onModelosChanged={() => { carregarModelos(); }}
          toast={toast}
        />
      )}

      {tab === "modelos" && (
        <ModelosTab conexoes={conexoes} modelos={modelos} onChanged={() => { carregarModelos(); }} toast={toast} />
      )}

      {tab === "conexoes" && ehPrivilegiado && (
        <ConexoesTab conexoes={conexoes} empreendimentos={empreendimentos} onChanged={() => carregarConexoes()} toast={toast} />
      )}
    </div>
  );
}

/* ════════════════ MEUS MTRs ════════════════ */

function MeusMtrsTab(props: { conexoes: Conexao[]; toast: ToastFn; onChanged: () => void }) {
  const { conexoes, toast, onChanged } = props;
  const [conexaoId, setConexaoId] = useState("");
  const [dataInicial, setDataInicial] = useState(() => haDias(30));
  const [dataFinal, setDataFinal] = useState(() => isoHoje(new Date()));
  const [lista, setLista] = useState<Manifesto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [toggle, setToggle] = useState("todos");
  const [pagina, setPagina] = useState(0);
  const [modalCancel, setModalCancel] = useState<Manifesto | null>(null);
  const [justificativaCancel, setJustificativaCancel] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [modalReceber, setModalReceber] = useState<Manifesto | null>(null);
  const [respNome, setRespNome] = useState("");
  const [respCargo, setRespCargo] = useState("");
  const [recebendo, setRecebendo] = useState(false);

  const conexaoEfetiva = conexoes.some((c) => c.id === Number(conexaoId)) ? conexaoId : conexoes.length ? String(conexoes[0].id) : "";

  const semRecebimento = lista.filter((m) => m.status === "EMITIDO" || m.status === "PENDENTE");
  const recebidos = lista.filter((m) => m.status === "RECEBIDO").length;
  const cancelados = lista.filter((m) => m.status === "CANCELADO").length;
  const visiveisToggle = toggle === "todos" ? lista : semRecebimento;
  const totalPaginas = Math.max(1, Math.ceil(visiveisToggle.length / POR_PAGINA));
  const pag = Math.min(pagina, totalPaginas - 1);
  const visiveis = visiveisToggle.slice(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA);

  async function consultar(forcarId?: string, tudo = false) {
    const id = forcarId ?? conexaoEfetiva;
    if (!id) {
      toast("Selecione a conexão", "error");
      return;
    }
    setCarregando(true);
    try {
      const sync = await fetch("/api/mtr-ima/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tudo ? { conexaoId: Number(id) } : { conexaoId: Number(id), dataInicial, dataFinal }),
      });
      const syncData = await sync.json();
      if (!sync.ok) {
        toast(syncData.error || "Falha ao consultar o portal", "error");
        return;
      }
      const res = await fetch("/api/mtr-ima/meus-mtrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tudo ? { conexaoId: Number(id) } : { conexaoId: Number(id), dataInicial, dataFinal },
        ),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Falha ao consultar", "error");
        return;
      }
      const mtrs = (await res.json()) as Manifesto[];
      setLista(mtrs);
      setPagina(0);
      toast(
        tudo
          ? `Portal IMA consultado: ${mtrs.length} MTR(s) (todos)`
          : `Portal IMA consultado: ${mtrs.length} MTR(s) de ${fmtIso(dataInicial)} a ${fmtIso(dataFinal)}`,
        "success",
      );
      onChanged();
    } catch {
      toast("Erro ao consultar", "error");
    } finally {
      setCarregando(false);
    }
  }

  async function recarregarLista(id: string) {
    try {
      const res = await fetch("/api/mtr-ima/meus-mtrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: Number(id) }),
      });
      if (res.ok) setLista(await res.json());
    } catch {
      // silencioso
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
      await recarregarLista(String(modalCancel.conexao.id));
      onChanged();
    } catch {
      toast("Erro ao cancelar", "error");
    } finally {
      setCancelando(false);
    }
  }

  async function receber() {
    if (!modalReceber) return;
    if (!respNome.trim() || !respCargo.trim()) {
      toast("Informe o responsável e o cargo do recebimento", "error");
      return;
    }
    setRecebendo(true);
    try {
      const res = await fetch("/api/mtr-ima/receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conexaoId: modalReceber.conexao.id, numero: modalReceber.numero, responsavel: respNome, cargo: respCargo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao receber", "error");
        return;
      }
      toast(data.mensagem || "MTR recebido", "success");
      setModalReceber(null);
      setRespNome("");
      setRespCargo("");
      await recarregarLista(String(modalReceber.conexao.id));
      onChanged();
    } catch {
      toast("Erro ao receber", "error");
    } finally {
      setRecebendo(false);
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
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Meus MTRs</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-500)]">Ao selecionar a conexão, busca todos os MTRs do portal IMA/SC. Use o período + Consultar para um intervalo específico.</p>
          </div>
          <button onClick={() => consultar()} disabled={carregando} className="focus-ring transition-brand hidden items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50 md:flex">
            {carregando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {carregando ? "Consultando..." : "Consultar portal"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Conexão</label>
            <select value={conexaoEfetiva} onChange={(e) => { setConexaoId(e.target.value); setLista([]); consultar(e.target.value, true); }} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Selecione...</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.unidade ? `${c.nome} — unid. ${c.unidade}` : c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Período da consulta — De</label>
            <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink-500)]">Período da consulta — Até</label>
            <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
        </div>
        <button onClick={() => consultar()} disabled={carregando} className="focus-ring transition-brand mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50 md:hidden">
          {carregando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {carregando ? "Consultando..." : "Consultar"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total de MTRs", valor: lista.length, cor: "text-[var(--color-ink-700)] bg-[var(--color-paper-100)]" },
          { label: "Recebidos", valor: recebidos, cor: "text-green-700 bg-green-50" },
          { label: "Sem recebimento", valor: semRecebimento.length, cor: "text-amber-700 bg-amber-50" },
          { label: "Cancelados", valor: cancelados, cor: "text-red-700 bg-red-50" },
        ].map((c) => (
          <div key={c.label} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <div className={`mb-2 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${c.cor}`}>{c.label}</div>
            <p className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">MTRs encontrados ({visiveisToggle.length})</h2>
          <div className="flex gap-1 text-xs">
            {[
              { key: "todos", label: `Todos (${lista.length})` },
              { key: "pendentes", label: `Sem recebimento (${semRecebimento.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setToggle(t.key); setPagina(0); }}
                className={`rounded-full px-3 py-1 font-medium ${toggle === t.key ? "bg-[var(--color-brand-500)] text-white" : "bg-[var(--color-paper-100)] text-[var(--color-ink-600)] hover:bg-[var(--color-paper-200)]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {visiveis.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">
            {carregando
              ? "Carregando..."
              : "Nenhum MTR encontrado. Selecione a conexão e o período e clique em Consultar portal."}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
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
                  {visiveis.map((m) => (
                    <tr key={m.id} className={`border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)] ${(m.status === "EMITIDO" || m.status === "PENDENTE") ? "bg-amber-50/40" : ""}`}>
                      <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{m.numero}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.clienteNome || (m.conexao.unidade ? `${m.conexao.nome} — unid. ${m.conexao.unidade}` : m.conexao.nome)}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.destinadorNome || "—"}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.transportadorNome || "—"}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{fmtData(m.dataExpedicao)}</td>
                      <td className="py-2 px-2">
                        {m.status === "RECEBIDO" ? (
                          <span className="text-xs font-medium text-green-700">Recebido</span>
                        ) : m.status === "CANCELADO" ? (
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-600)]"}`}>{m.status}</span>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">Sem recebimento</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <button onClick={() => baixarPdf(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Baixar PDF do MTR"><FileDown size={14} /></button>
                          {(m.status === "EMITIDO" || m.status === "PENDENTE") && (
                            <button onClick={() => setModalReceber(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-green-50 hover:text-green-600" title="Receber"><PackageCheck size={14} /></button>
                          )}
                          {m.status !== "CANCELADO" && (
                            <button onClick={() => setModalCancel(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Cancelar MTR"><Ban size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {visiveis.map((m) => (
                <li key={m.id} className={`rounded-lg border border-[var(--color-paper-200)] p-3 text-sm ${(m.status === "EMITIDO" || m.status === "PENDENTE") ? "bg-amber-50/40" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--color-ink-800)]">MTR {m.numero}</span>
                    <button onClick={() => baixarPdf(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)]" title="Baixar PDF do MTR"><FileDown size={14} /></button>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--color-ink-600)]">
                    <dt className="font-medium">Gerador</dt><dd className="truncate">{m.clienteNome || (m.conexao.unidade ? `${m.conexao.nome} — unid. ${m.conexao.unidade}` : m.conexao.nome)}</dd>
                    <dt className="font-medium">Transportador</dt><dd className="truncate">{m.transportadorNome || "—"}</dd>
                    <dt className="font-medium">Expedição</dt><dd>{fmtData(m.dataExpedicao)}</dd>
                  </dl>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-500)]">
              <span>{visiveisToggle.length} registro(s) — Página {pag + 1} de {totalPaginas}</span>
              <div className="flex gap-2">
                <button disabled={pag === 0} onClick={() => setPagina((p) => p - 1)} className="rounded px-2 py-1 disabled:opacity-40">Anterior</button>
                <button disabled={pag === totalPaginas - 1} onClick={() => setPagina((p) => p + 1)} className="rounded px-2 py-1 disabled:opacity-40">Próxima</button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalReceber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalReceber(null)}>
          <div className="shadow-card w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display mb-3 font-semibold text-[var(--color-ink-900)]">Receber MTR {modalReceber.numero}</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Responsável pelo recebimento</label>
                <input value={respNome} onChange={(e) => setRespNome(e.target.value)} placeholder="Nome do responsável..." className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-ink-500)]">Cargo</label>
                <input value={respCargo} onChange={(e) => setRespCargo(e.target.value)} placeholder="Cargo do responsável..." className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalReceber(null)} className="rounded-lg bg-[var(--color-paper-100)] px-4 py-2 text-sm text-[var(--color-ink-700)]">Voltar</button>
              <button onClick={receber} disabled={recebendo} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {recebendo ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} Receber
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalCancel(null)}>
          <div className="shadow-card w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display mb-3 font-semibold text-[var(--color-ink-900)]">Cancelar MTR {modalCancel.numero}</h3>
            <p className="mb-3 text-sm text-[var(--color-ink-600)]">O cancelamento será enviado ao IMA/SC. Esta ação não pode ser desfeita.</p>
            <textarea value={justificativaCancel} onChange={(e) => setJustificativaCancel(e.target.value)} rows={4} maxLength={500} placeholder="Ex.: emissão com dados incorretos..." className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            <p className="mt-1 text-right text-xs text-[var(--color-ink-400)]">{justificativaCancel.length}/500</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalCancel(null)} className="rounded-lg bg-[var(--color-paper-100)] px-4 py-2 text-sm text-[var(--color-ink-700)]">Voltar</button>
              <button onClick={cancelar} disabled={cancelando} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {cancelando ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════ EMITIR ════════════════ */

function EmitirTab(props: { conexoes: Conexao[]; empreendimentos: EmpreendimentoOpcao[]; modelos: ModeloMtrIma[]; onEmitido: () => void; onModelosChanged: () => void; toast: ToastFn }) {
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
  const [modeloId, setModeloId] = useState("");

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

  function aplicarModelo(id: string) {
    setModeloId(id);
    const modelo = modelos.find((m) => m.id === Number(id));
    if (!modelo) return;
    setForm((f) => ({
      ...f,
      conexaoId: modelo.conexaoId ? String(modelo.conexaoId) : f.conexaoId,
      clienteNome: modelo.clienteNome || f.clienteNome,
      empreendNome: modelo.empreendNome || f.empreendNome,
      cnpTransportador: modelo.transportadorCnpj || "",
      codUnidadeTransportador: modelo.transportadorUnidade ? String(modelo.transportadorUnidade) : "",
      transportadorNome: modelo.transportadorNome || "",
      cnpDestinador: modelo.destinadorCnpj || "",
      codUnidadeDestinador: modelo.destinadorUnidade ? String(modelo.destinadorUnidade) : "",
      destinadorNome: modelo.destinadorNome || "",
      manifTransportadorNomeMotorista: modelo.nomeMotorista || f.manifTransportadorNomeMotorista,
      manifTransportadorPlacaVeiculo: modelo.placaVeiculo || f.manifTransportadorPlacaVeiculo,
      observacoes: modelo.observacoes || f.observacoes,
    }));
    setResiduos(modelo.residuos.map((r) => ({ ...r })));
    toast(`Modelo "${modelo.nome}" aplicado (${modelo.residuos.length} resíduo(s))`, "success");
  }

  async function salvarComoModelo() {
    const nome = prompt("Nome do modelo:");
    if (!nome || !nome.trim()) return;
    try {
      const res = await fetch("/api/mtr-ima/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          conexaoId: conexaoEfetiva ? Number(conexaoEfetiva) : null,
          clienteNome: form.clienteNome || undefined,
          empreendNome: form.empreendNome || undefined,
          nomeResponsavel: responsavel || undefined,
          cargoResponsavel: form.manifGeradorCargoResponsavel || undefined,
          cnpTransportador: form.cnpTransportador || undefined,
          codUnidadeTransportador: form.codUnidadeTransportador ? Number(form.codUnidadeTransportador) : undefined,
          transportadorNome: form.transportadorNome || undefined,
          cnpDestinador: form.cnpDestinador || undefined,
          codUnidadeDestinador: form.codUnidadeDestinador ? Number(form.codUnidadeDestinador) : undefined,
          destinadorNome: form.destinadorNome || undefined,
          nomeMotorista: form.manifTransportadorNomeMotorista || undefined,
          placaVeiculo: form.manifTransportadorPlacaVeiculo || undefined,
          observacoes: form.observacoes || undefined,
          residuos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao salvar modelo", "error");
        return;
      }
      toast(`Modelo "${nome.trim()}" salvo`, "success");
      onModelosChanged();
    } catch {
      toast("Erro ao salvar modelo", "error");
    }
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
    const semQtd = residuos.findIndex((r) => !(Number(r.quantidade) > 0));
    if (semQtd >= 0) {
      toast(`Informe a quantidade do resíduo ${residuos[semQtd].residuo || `#${semQtd + 1}`}`, "error");
      return;
    }
    const semCodigo = residuos.findIndex((r) => !r.residuo.replace(/\D/g, ""));
    if (semCodigo >= 0) {
      toast(`Resíduo "${residuos[semCodigo].residuo || `#${semCodigo + 1}`}" sem código IBAMA válido — corrija antes de emitir`, "error");
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
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Dados do Gerador</h2>
        <p className="mb-3 text-sm text-[var(--color-ink-500)]">Empresa que gera o resíduo — preenchida pelo empreendimento</p>
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Modelo pré-cadastrado (opcional)</label>
            <select value={modeloId} onChange={(e) => aplicarModelo(e.target.value)} className={inputCls}>
              <option value="">Selecione um modelo...</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}{m.conexao ? ` — ${m.conexao.nome}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={salvarComoModelo} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)]" title="Salva o preenchimento atual como modelo">
              <Save size={15} /> Salvar como modelo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelCls}>Conexão MTR-IMA/SC</label>
            <select value={conexaoEfetiva} onChange={(e) => {
              const id = e.target.value;
              const c = conexoes.find((x) => x.id === Number(id));
              setForm((f) => ({ ...f, conexaoId: id, cnpGerador: f.cnpGerador || c?.cnpj?.replace(/\D/g, "") || "" }));
              setModeloId("");
            }} className={inputCls}>
              <option value="">Selecione...</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.unidade ? `${c.nome} — unid. ${c.unidade}` : c.nome}</option>
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
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Dados do Transportador</h2>
        <p className="mb-3 text-sm text-[var(--color-ink-500)]">Transportador do resíduo até o destinador</p>
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
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Dados do Destinador</h2>
        <p className="mb-3 text-sm text-[var(--color-ink-500)]">Destinador responsável pelo tratamento/disposição do resíduo</p>
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
            <label className={labelCls}>Observações ({form.observacoes.length}/4000)</label>
            <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} maxLength={4000} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Código de referência interno (somente números)</label>
            <input value={form.seuCodigoReferencia} onChange={(e) => setForm((f) => ({ ...f, seuCodigoReferencia: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="Ex.: 123" />
          </div>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Resíduos ({residuos.length})</h2>
          <button onClick={() => { setEditandoResiduo(null); setResiduoForm(emptyResiduo); setModalResiduo(true); }} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
            <Plus size={15} /> Adicionar resíduo
          </button>
        </div>
        <p className="mb-3 text-sm text-[var(--color-ink-500)]">Adicione os resíduos transportados — cada um é uma linha da tabela</p>
        {residuos.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">Nenhum resíduo cadastrado. Clique em &quot;Adicionar resíduo&quot;.</p>
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
                  <tr key={i} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{r.residuo}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={r.quantidade}
                          onChange={(e) => setResiduos((rs) => rs.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))}
                          className="w-24 rounded-lg border border-[var(--color-paper-200)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                          placeholder="0"
                        />
                        <span className="text-xs">{catalogos?.unidades.find((u) => u.codigo === Number(r.codigoUnidade))?.sigla || ""}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.estadosFisicos.find((e) => e.codigo === Number(r.codigoTipoEstado))?.descricao || r.codigoTipoEstado}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.classes.find((c) => c.codigo === Number(r.codigoClasse))?.descricao || r.codigoClasse}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.acondicionamentos.find((a) => a.codigo === Number(r.codigoAcondicionamento))?.descricao || r.codigoAcondicionamento}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.tratamentos.find((t) => t.codigo === Number(r.codigoTecnologia))?.descricao || r.codigoTecnologia}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{r.numeroONU || "—"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditandoResiduo(i); setResiduoForm(r); setModalResiduo(true); }} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Editar resíduo"><X size={14} /></button>
                        <button onClick={() => setResiduos((rs) => rs.filter((_, j) => j !== i))} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover resíduo"><Trash2 size={14} /></button>
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

/* ════════════════ MODELOS ════════════════ */

const emptyModeloForm = {
  nome: "",
  descricao: "",
  conexaoId: "",
  transportadorCnpj: "",
  transportadorUnidade: "",
  transportadorNome: "",
  destinadorCnpj: "",
  destinadorUnidade: "",
  destinadorNome: "",
  nomeMotorista: "",
  placaVeiculo: "",
  observacoes: "",
};

function ModelosTab(props: { conexoes: Conexao[]; modelos: ModeloMtrIma[]; onChanged: () => void; toast: ToastFn }) {
  const { conexoes, modelos, onChanged, toast } = props;
  const [form, setForm] = useState(emptyModeloForm);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [conexaoImport, setConexaoImport] = useState("");
  const [residuosEdicao, setResiduosEdicao] = useState<ResiduoModelo[]>([]);
  const [modalResiduo, setModalResiduo] = useState(false);
  const [editandoResIdx, setEditandoResIdx] = useState<number | null>(null);
  const [resForm, setResForm] = useState<ResiduoModelo>({ residuo: "", quantidade: "", codigoUnidade: "3", codigoTipoEstado: "1", codigoClasse: "1", codigoAcondicionamento: "1", codigoTecnologia: "1", numeroONU: "", classeDeRisco: "", nomeEmbarque: "", grupoEmbalagem: "" });
  const [catalogos, setCatalogos] = useState<MtrImaCatalogosFront | null>(null);

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
  const labelCls = "text-xs font-medium text-[var(--color-ink-500)]";

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

  async function importar() {
    setImportando(true);
    try {
      const res = await fetch("/api/mtr-ima/modelos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conexaoImport ? { conexaoId: Number(conexaoImport) } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao importar modelos", "error");
        return;
      }
      const totais = (data.resultados || []).reduce(
        (acc: { total: number; importados: number; atualizados: number }, r: { total: number; importados: number; atualizados: number }) => ({
          total: acc.total + r.total,
          importados: acc.importados + r.importados,
          atualizados: acc.atualizados + r.atualizados,
        }),
        { total: 0, importados: 0, atualizados: 0 },
      );
      toast(`Modelos do portal: ${totais.total} encontrado(s), ${totais.importados} importado(s), ${totais.atualizados} atualizado(s)`, "success");
      onChanged();
    } catch {
      toast("Erro ao importar modelos", "error");
    } finally {
      setImportando(false);
    }
  }

  function editar(m: ModeloMtrIma) {
    setEditandoId(m.id);    setForm({
      nome: m.nome,
      descricao: m.descricao || "",
      conexaoId: m.conexaoId ? String(m.conexaoId) : "",
      transportadorCnpj: m.transportadorCnpj || "",
      transportadorUnidade: m.transportadorUnidade ? String(m.transportadorUnidade) : "",
      transportadorNome: m.transportadorNome || "",
      destinadorCnpj: m.destinadorCnpj || "",
      destinadorUnidade: m.destinadorUnidade ? String(m.destinadorUnidade) : "",
      destinadorNome: m.destinadorNome || "",
      nomeMotorista: m.nomeMotorista || "",
      placaVeiculo: m.placaVeiculo || "",
      observacoes: m.observacoes || "",
    });
    setResiduosEdicao(m.residuos.map((r) => ({ ...r })));
    toast(`Editando modelo "${m.nome}"`, "info");
  }

  function novoModelo() {
    setEditandoId(null);
    setForm(emptyModeloForm);
    setResiduosEdicao([]);
  }

  function adicionarResiduoModelo() {
    if (!resForm.residuo.trim()) {
      toast("Informe o código IBAMA do resíduo", "error");
      return;
    }
    if (editandoResIdx != null) {
      setResiduosEdicao((rs) => rs.map((r, i) => (i === editandoResIdx ? resForm : r)));
      setEditandoResIdx(null);
    } else {
      setResiduosEdicao((rs) => [...rs, resForm]);
    }
    setResForm({ residuo: "", quantidade: "", codigoUnidade: "3", codigoTipoEstado: "1", codigoClasse: "1", codigoAcondicionamento: "1", codigoTecnologia: "1", numeroONU: "", classeDeRisco: "", nomeEmbarque: "", grupoEmbalagem: "" });
    setModalResiduo(false);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast("Informe o nome do modelo", "error");
      return;
    }
    setSalvando(true);
    try {
      const corpo = {
        nome: form.nome.trim(),
        descricao: form.descricao || undefined,
        conexaoId: form.conexaoId ? Number(form.conexaoId) : null,
        transportadorCnpj: form.transportadorCnpj || undefined,
        transportadorUnidade: form.transportadorUnidade ? Number(form.transportadorUnidade) : undefined,
        transportadorNome: form.transportadorNome || undefined,
        destinadorCnpj: form.destinadorCnpj || undefined,
        destinadorUnidade: form.destinadorUnidade ? Number(form.destinadorUnidade) : undefined,
        destinadorNome: form.destinadorNome || undefined,
        nomeMotorista: form.nomeMotorista || undefined,
        placaVeiculo: form.placaVeiculo || undefined,
        observacoes: form.observacoes || undefined,
        residuos: residuosEdicao,
      };
      const res = editandoId != null
        ? await fetch(`/api/mtr-ima/modelos/${editandoId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) })
        : await fetch("/api/mtr-ima/modelos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Falha ao salvar modelo", "error");
        return;
      }
      toast(editandoId != null ? "Modelo atualizado" : "Modelo cadastrado", "success");
      novoModelo();
      onChanged();
    } catch {
      toast("Erro ao salvar modelo", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(m: ModeloMtrIma) {
    if (!confirm(`Remover o modelo "${m.nome}"?`)) return;
    const res = await fetch(`/api/mtr-ima/modelos/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Modelo removido", "success");
      if (editandoId === m.id) novoModelo();
      onChanged();
    } else {
      toast("Falha ao remover modelo", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Importar do portal IMA/SC</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Conexão</label>
            <select value={conexaoImport} onChange={(e) => setConexaoImport(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Todas</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.unidade ? `${c.nome} — unid. ${c.unidade}` : c.nome}</option>
              ))}
            </select>
          </div>
          <button onClick={importar} disabled={importando} className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
            {importando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {importando ? "Importando..." : "Importar modelos"}
          </button>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">{editandoId != null ? `Editando modelo: ${form.nome || ""}` : "Novo modelo"}</h2>
          {editandoId != null && (
            <button onClick={novoModelo} className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">Novo modelo</button>
          )}
        </div>
        <p className="mb-3 text-sm text-[var(--color-ink-500)]">Um modelo pré-preenche transportador, destinador e resíduos na emissão. Os resíduos vêm da importação do portal.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nome do modelo *</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className={inputCls} placeholder="Ex.: Madeira CETRIC" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Conexão padrão (opcional)</label>
            <select value={form.conexaoId} onChange={(e) => setForm((f) => ({ ...f, conexaoId: e.target.value }))} className={inputCls}>
              <option value="">Qualquer conexão</option>
              {conexoes.map((c) => (
                <option key={c.id} value={c.id}>{c.unidade ? `${c.nome} — unid. ${c.unidade}` : c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className={labelCls}>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CNPJ Transportador</label>
            <input value={form.transportadorCnpj} onChange={(e) => setForm((f) => ({ ...f, transportadorCnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Transportador (razão social)</label>
            <input value={form.transportadorNome} onChange={(e) => setForm((f) => ({ ...f, transportadorNome: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Unidade Transportador (código)</label>
            <input value={form.transportadorUnidade} onChange={(e) => setForm((f) => ({ ...f, transportadorUnidade: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CNPJ Destinador</label>
            <input value={form.destinadorCnpj} onChange={(e) => setForm((f) => ({ ...f, destinadorCnpj: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="00000000000000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Destinador (razão social)</label>
            <input value={form.destinadorNome} onChange={(e) => setForm((f) => ({ ...f, destinadorNome: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Unidade Destinador (código)</label>
            <input value={form.destinadorUnidade} onChange={(e) => setForm((f) => ({ ...f, destinadorUnidade: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Motorista</label>
            <input value={form.nomeMotorista} onChange={(e) => setForm((f) => ({ ...f, nomeMotorista: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Placa do veículo</label>
            <input value={form.placaVeiculo} onChange={(e) => setForm((f) => ({ ...f, placaVeiculo: e.target.value.toUpperCase() }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Observações</label>
            <input value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Resíduos do modelo ({residuosEdicao.length})</h3>
            <button onClick={() => { setEditandoResIdx(null); setResForm({ residuo: "", quantidade: "", codigoUnidade: "3", codigoTipoEstado: "1", codigoClasse: "1", codigoAcondicionamento: "1", codigoTecnologia: "1", numeroONU: "", classeDeRisco: "", nomeEmbarque: "", grupoEmbalagem: "" }); setModalResiduo(true); }} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-600)]">
              <Plus size={13} /> Adicionar resíduo
            </button>
          </div>
          {residuosEdicao.length === 0 ? (
            <p className="py-3 text-center text-sm text-[var(--color-ink-500)]">Nenhum resíduo no modelo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-paper-200)] text-left">
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Resíduo (IBAMA)</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Estado</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Classe</th>
                    <th className="py-2 px-2 font-medium text-[var(--color-ink-700)]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {residuosEdicao.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--color-paper-100)]">
                      <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">{r.residuo || "—"}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.estadosFisicos.find((e) => e.codigo === Number(r.codigoTipoEstado))?.descricao || r.codigoTipoEstado || "—"}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-600)]">{catalogos?.classes.find((c) => c.codigo === Number(r.codigoClasse))?.descricao || r.codigoClasse || "—"}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditandoResIdx(i); setResForm({ ...r }); setModalResiduo(true); }} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => setResiduosEdicao((rs) => rs.filter((_, j) => j !== i))} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <button onClick={salvar} disabled={salvando} className="focus-ring transition-brand mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {salvando ? "Salvando..." : editandoId != null ? "Atualizar modelo" : "Salvar modelo"}
        </button>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display mb-3 text-base font-semibold text-[var(--color-ink-900)]">Modelos cadastrados</h2>
        {modelos.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-ink-500)]">Nenhum modelo cadastrado. Importe do portal IMA/SC acima.</p>
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
                    <td className="py-2 px-2 font-medium text-[var(--color-ink-800)]">
                      {m.nome}
                      {m.codigoPortal != null && <span className="ml-2 rounded bg-[var(--color-paper-100)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-500)]">portal #{m.codigoPortal}</span>}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.transportadorNome || m.transportadorCnpj || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.destinadorNome || m.destinadorCnpj || "—"}</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.residuos.length} resíduo(s)</td>
                    <td className="py-2 px-2 text-[var(--color-ink-600)]">{m.conexao ? (m.conexao.unidade ? `${m.conexao.nome} — unid. ${m.conexao.unidade}` : m.conexao.nome) : "—"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => editar(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => remover(m)} className="rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600" title="Remover"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalResiduo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalResiduo(false)}>
          <div className="shadow-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display mb-3 font-semibold text-[var(--color-ink-900)]">{editandoResIdx != null ? "Editar resíduo" : "Novo resíduo"}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Código IBAMA do resíduo</label>
                <input value={resForm.residuo} onChange={(e) => setResForm((r) => ({ ...r, residuo: e.target.value }))} className={inputCls} placeholder="Ex.: 010504" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Quantidade</label>
                <input type="number" value={resForm.quantidade} onChange={(e) => setResForm((r) => ({ ...r, quantidade: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Unidade</label>
                <select value={resForm.codigoUnidade} onChange={(e) => setResForm((r) => ({ ...r, codigoUnidade: e.target.value }))} className={inputCls}>
                  {catalogos?.unidades.map((u) => (
                    <option key={u.codigo} value={u.codigo}>{u.nome} ({u.sigla})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Estado físico</label>
                <select value={resForm.codigoTipoEstado} onChange={(e) => setResForm((r) => ({ ...r, codigoTipoEstado: e.target.value }))} className={inputCls}>
                  {catalogos?.estadosFisicos.map((e) => (
                    <option key={e.codigo} value={e.codigo}>{e.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Classe</label>
                <select value={resForm.codigoClasse} onChange={(e) => setResForm((r) => ({ ...r, codigoClasse: e.target.value }))} className={inputCls}>
                  {catalogos?.classes.map((c) => (
                    <option key={c.codigo} value={c.codigo}>{c.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Acondicionamento</label>
                <select value={resForm.codigoAcondicionamento} onChange={(e) => setResForm((r) => ({ ...r, codigoAcondicionamento: e.target.value }))} className={inputCls}>
                  {catalogos?.acondicionamentos.map((a) => (
                    <option key={a.codigo} value={a.codigo}>{a.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Tecnologia de tratamento</label>
                <select value={resForm.codigoTecnologia} onChange={(e) => setResForm((r) => ({ ...r, codigoTecnologia: e.target.value }))} className={inputCls}>
                  {catalogos?.tratamentos.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>N.º ONU (opcional)</label>
                <input value={resForm.numeroONU} onChange={(e) => setResForm((r) => ({ ...r, numeroONU: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Classe de risco (opcional)</label>
                <input value={resForm.classeDeRisco} onChange={(e) => setResForm((r) => ({ ...r, classeDeRisco: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Nome de embarque (opcional)</label>
                <input value={resForm.nomeEmbarque} onChange={(e) => setResForm((r) => ({ ...r, nomeEmbarque: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Grupo de embalagem (opcional)</label>
                <input value={resForm.grupoEmbalagem} onChange={(e) => setResForm((r) => ({ ...r, grupoEmbalagem: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalResiduo(false)} className="rounded-lg bg-[var(--color-paper-100)] px-4 py-2 text-sm text-[var(--color-ink-700)]">Cancelar</button>
              <button onClick={adicionarResiduoModelo} className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white">
                <PackagePlus size={16} /> {editandoResIdx != null ? "Salvar" : "Adicionar"}
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
