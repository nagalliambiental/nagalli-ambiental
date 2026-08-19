"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Topbar } from "@/components/Topbar";
import { Building2, Loader2, Save, Search, ClipboardList, Settings } from "lucide-react";
import { useToast } from "@/components/Toast";

type Tab = "empresa" | "logs";

interface LogEntry {
  id: number;
  acao: string;
  entidade: string;
  entidadeId: number;
  dados: string | null;
  usuarioId: number | null;
  criadoEm: string;
  usuario: { nome: string; email: string } | null;
}

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("empresa");

  return (
    <div>
      <Topbar icon={Settings} title="Configurações" subtitle="Dados da empresa" />

      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex gap-1 border-b border-[var(--color-paper-200)]">
          <button onClick={() => setTab("empresa")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === "empresa" ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]" : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"}`}>
            <Building2 size={16} />
            Dados da Empresa
          </button>
          <button onClick={() => setTab("logs")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === "logs" ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]" : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"}`}>
            <ClipboardList size={16} />
            Logs
          </button>
        </div>

        {tab === "empresa" ? <EmpresaTab /> : <LogsTab />}
      </div>
    </div>
  );
}

function EmpresaTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    rua: "",
    numero: "",
    bairro: "",
    complemento: "",
    cep: "",
    municipio: "",
    uf: "",
    telefone: "",
    email: "",
    website: "",
    logo: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/empresa")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setForm((prev) => ({ ...prev, ...data }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function formatCNPJ(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function setField(field: string, value: string) {
    const masked = field === "cnpj" ? formatCNPJ(value) : value;
    setForm((prev) => ({ ...prev, [field]: masked }));
  }

  async function buscarCNPJ() {
    const clean = form.cnpj.replace(/\D/g, "");
    if (clean.length !== 14) { toast("CNPJ inválido (14 dígitos)", "error"); return; }
    try {
      const res = await fetch(`/api/cnpj/${clean}`);
      if (!res.ok) { toast("CNPJ não encontrado", "error"); return; }
      const d = await res.json();
      setForm((prev) => ({
        ...prev,
        razaoSocial: d.razaoSocial || prev.razaoSocial,
        nomeFantasia: d.nomeFantasia || prev.nomeFantasia,
        rua: d.enderecoRua || prev.rua,
        numero: d.enderecoNumero || prev.numero,
        bairro: d.bairro || prev.bairro,
        complemento: d.enderecoComplemento || prev.complemento,
        cep: d.cep || prev.cep,
        municipio: d.municipio || prev.municipio,
        uf: d.uf || prev.uf,
        telefone: d.telefone || prev.telefone,
        email: d.email || prev.email,
      }));
      toast("Dados preenchidos via CNPJ", "success");
    } catch {
      toast("Erro ao consultar CNPJ", "error");
    }
  }

  async function buscarCEP() {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) { toast("CEP inválido (8 dígitos)", "error"); return; }
    try {
      const res = await fetch(`/api/cep/${clean}`);
      if (!res.ok) { toast("CEP não encontrado", "error"); return; }
      const d = await res.json();
      setForm((prev) => ({
        ...prev,
        rua: d.rua || prev.rua,
        bairro: d.bairro || prev.bairro,
        municipio: d.municipio || prev.municipio,
        uf: d.uf || prev.uf,
        complemento: d.complemento || prev.complemento,
      }));
      toast("Endereço preenchido via CEP", "success");
    } catch {
      toast("Erro ao consultar CEP", "error");
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setMsg("Erro ao salvar"); return; }
    setMsg("Configurações salvas com sucesso!");
  }

  if (!loaded) return null;

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Building2 size={20} className="text-[var(--color-brand-500)]" />
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Dados da Empresa</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Razão Social</label>
          <input value={form.razaoSocial} onChange={(e) => setField("razaoSocial", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome Fantasia</label>
          <input value={form.nomeFantasia} onChange={(e) => setField("nomeFantasia", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CNPJ</label>
          <div className="flex gap-2">
            <input value={form.cnpj} onChange={(e) => setField("cnpj", e.target.value)} className="flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            <button type="button" onClick={buscarCNPJ} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] whitespace-nowrap">
              <Search size={14} />
              Buscar
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Telefone</label>
          <input value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Website</label>
          <input value={form.website} onChange={(e) => setField("website", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
        </div>
      </div>

      <div className="border-t border-[var(--color-paper-200)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink-900)] mb-3">Endereço</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Rua</label>
            <input value={form.rua} onChange={(e) => setField("rua", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Número</label>
            <input value={form.numero} onChange={(e) => setField("numero", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Bairro</label>
            <input value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Complemento</label>
            <input value={form.complemento} onChange={(e) => setField("complemento", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CEP</label>
            <div className="flex gap-2">
              <input value={form.cep} onChange={(e) => setField("cep", e.target.value)} className="w-28 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              <button type="button" onClick={buscarCEP} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] whitespace-nowrap">
                <Search size={14} />
                Buscar
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Município</label>
            <input value={form.municipio} onChange={(e) => setField("municipio", e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">UF</label>
            <input value={form.uf} onChange={(e) => setField("uf", e.target.value)} maxLength={2} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-paper-200)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink-900)] mb-3">Logo</h3>
        <p className="text-xs text-[var(--color-ink-500)] mb-2">URL da imagem da logo (ex: /Logo.jpeg)</p>
        <div className="flex items-center gap-3">
          <input value={form.logo} onChange={(e) => setField("logo", e.target.value)} placeholder="/Logo.jpeg" className="flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          {form.logo && <Image src={form.logo} alt="logo" width={40} height={40} className="h-10 w-10 rounded object-contain border" />}
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.includes("sucesso") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar</>}
        </button>
      </div>
    </div>
  );
}

const ACOES = ["LOGIN", "LOGOUT", "VISUALIZAR", "DOWNLOAD", "CRIAR", "ATUALIZAR", "EXCLUIR"];

function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<{ id: number; nome: string }[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroEntidade, setFiltroEntidade] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadUsuarios() {
      try {
        const res = await fetch("/api/usuarios", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setUsuarios((data || []).map((u: { id: number; nome: string }) => ({ id: u.id, nome: u.nome })));
        }
      } catch {
        // lista de usuários é opcional; segue sem o filtro
      }
    }
    loadUsuarios();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (filtroUsuario) params.set("usuarioId", filtroUsuario);
        if (filtroEntidade) params.set("entidade", filtroEntidade);
        if (filtroAcao) params.set("acao", filtroAcao);
        if (dataInicio) params.set("dataInicio", dataInicio);
        if (dataFim) params.set("dataFim", dataFim);
        const res = await fetch(`/api/auditoria?${params}`, { signal: controller.signal });
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        if (!controller.signal.aborted) setLogs([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [page, filtroUsuario, filtroEntidade, filtroAcao, dataInicio, dataFim]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  const acaoColors: Record<string, string> = {
    LOGIN: "text-green-600 bg-green-50",
    LOGOUT: "text-orange-600 bg-orange-50",
    VISUALIZAR: "text-violet-600 bg-violet-50",
    DOWNLOAD: "text-river-600 bg-river-50",
    CRIAR: "text-green-600 bg-green-50",
    ATUALIZAR: "text-blue-600 bg-blue-50",
    EXCLUIR: "text-red-600 bg-red-50",
  };

  const inputCls = "rounded-lg border border-[var(--color-paper-200)] px-2.5 py-1.5 text-xs text-[var(--color-ink-700)] focus:border-[var(--color-brand-400)] focus:outline-none";

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList size={20} className="text-[var(--color-brand-500)]" />
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Auditoria</h2>
        <span className="text-xs text-[var(--color-ink-500)] ml-auto">{total} registro(s)</span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-ink-500)]">Usuário</label>
          <select value={filtroUsuario} onChange={(e) => { setPage(1); setFiltroUsuario(e.target.value); }} className={inputCls}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-ink-500)]">Entidade</label>
          <input value={filtroEntidade} onChange={(e) => { setPage(1); setFiltroEntidade(e.target.value); }} placeholder="Ex.: Cliente" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-ink-500)]">Ação</label>
          <select value={filtroAcao} onChange={(e) => { setPage(1); setFiltroAcao(e.target.value); }} className={inputCls}>
            <option value="">Todas</option>
            {ACOES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-ink-500)]">De</label>
          <input type="date" value={dataInicio} onChange={(e) => { setPage(1); setDataInicio(e.target.value); }} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-ink-500)]">Até</label>
          <input type="date" value={dataFim} onChange={(e) => { setPage(1); setDataFim(e.target.value); }} className={inputCls} />
        </div>
        {(filtroUsuario || filtroEntidade || filtroAcao || dataInicio || dataFim) && (
          <button
            onClick={() => {
              setPage(1);
              setFiltroUsuario("");
              setFiltroEntidade("");
              setFiltroAcao("");
              setDataInicio("");
              setDataFim("");
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--color-brand-500)]" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)] py-8 text-center">Nenhum log encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)]">
                <th className="text-left py-2 px-2 font-medium text-[var(--color-ink-700)]">Data/Hora</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--color-ink-700)]">Ação</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--color-ink-700)]">Entidade</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--color-ink-700)]">ID</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--color-ink-700)]">Usuário</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--color-ink-700)]">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--color-paper-100)] hover:bg-[var(--color-paper-50)]">
                  <td className="py-2 px-2 text-[var(--color-ink-600)] whitespace-nowrap">{formatDate(log.criadoEm)}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${acaoColors[log.acao.toUpperCase()] || "text-[var(--color-ink-600)] bg-[var(--color-paper-100)]"}`}>
                      {log.acao.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)] capitalize">{log.entidade}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{log.entidadeId}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-600)]">{log.usuario?.nome || "—"}</td>
                  <td className="py-2 px-2 text-[var(--color-ink-500)] max-w-[220px] truncate">
                    {log.dados ? <span title={log.dados} className="cursor-help font-mono text-xs">{log.dados}</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[var(--color-ink-500)]">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-[var(--color-paper-200)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-50)] disabled:opacity-40 disabled:cursor-not-allowed">
              Anterior
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-[var(--color-paper-200)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-50)] disabled:opacity-40 disabled:cursor-not-allowed">
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
