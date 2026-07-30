"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2, Mail, Phone, User, FileText, MapPin, Map, Globe, FileSpreadsheet,
  Edit3, Trash2, Plus, ExternalLink, CheckCircle2, Clock, AlertTriangle,
  Loader2, X, AlertCircle, Upload, Download, FolderArchive, ArrowLeft, ChevronDown as ChevronDownIcon
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { TEMPLATES } from "@/lib/templates";
import { HistoricoTab } from "@/components/HistoricoTab";

type Tab = "info" | "empreendimentos" | "documentos" | "financeiro" | "historico";

interface ClienteData {
  id: number;
  apelido: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  telefone: string;
  email: string;
  respLegal: string;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  criadoEm: string;
  ativo: boolean;
  empreendimentos: EmpreendimentoData[];
  financeiros: FinanceiroData[];
  documentosGerados: DocData[];
}

interface EmpreendimentoData {
  id: number;
  apelido: string;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  ativo: boolean;
  _count: { processos: number };
  controleDmr: {
    id: number;
    t1Dmr: string; t1Mtr: string;
    t2Dmr: string; t2Mtr: string;
    t3Dmr: string; t3Mtr: string;
    t4Dmr: string; t4Mtr: string;
  } | null;
}

interface FinanceiroData {
  id: number;
  tipoCobranca: string;
  valor: number;
  formaPagamento: string | null;
  statusPagamento: string;
  dataVencimento: string | null;
}

interface DocData {
  id: number;
  templateSlug: string;
  createdAt: string;
}

interface DocumentoUploaded {
  id: number;
  nome: string;
  tipo: string;
  caminho: string;
  tamanho: number;
  criadoEm: string;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente", pago: "Pago", atrasado: "Atrasado", cancelado: "Cancelado",
};
const statusColors: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700", pago: "bg-green-50 text-green-700",
  atrasado: "bg-red-50 text-red-700", cancelado: "bg-gray-50 text-gray-500",
};

export function ClienteDetailClient({
  cliente, documentos, id, diasFimTrimestre, trimestreLabel,
}: {
  cliente: ClienteData;
  documentos: DocumentoUploaded[];
  id: string;
  diasFimTrimestre: number;
  trimestreLabel: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const perfil = (session?.user as { perfil?: string })?.perfil;
  const podeVerFinanceiro = perfil === "socio" || perfil === "admin";

  const [tab, setTab] = useState<Tab>("info");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [gerarOpen, setGerarOpen] = useState(false);
  const gerarRef = useRef<HTMLDivElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNome, setUploadNome] = useState("");
  const [uploadTipo, setUploadTipo] = useState("anexo");

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.erro || "Erro ao excluir cliente", "error");
        setDeleting(false);
        setConfirmDelete(false);
        return;
      }
      toast("Cliente excluído com sucesso", "success");
      router.push("/clientes");
      router.refresh();
    } catch {
      toast("Erro ao excluir cliente", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleUpload() {
    if (!uploadFile) { toast("Selecione um arquivo", "error"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("clienteId", id);
      if (uploadNome) formData.append("nome", uploadNome);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erro ao enviar");
      toast("Documento enviado com sucesso", "success");
      setUploadFile(null);
      setUploadNome("");
      router.refresh();
    } catch {
      toast("Erro ao enviar documento", "error");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (gerarRef.current && !gerarRef.current.contains(e.target as Node)) {
        setGerarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleExportZip() {
    setExporting(true);
    try {
      const res = await fetch(`/api/clientes/${id}/exportar-documentos`);
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${cliente.apelido.replace(/\s+/g, "_")}_documentos.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast("Erro ao exportar documentos", "error");
    } finally {
      setExporting(false);
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Informações" },
    { key: "empreendimentos", label: "Empreendimentos", count: cliente.empreendimentos.length },
    { key: "documentos", label: "Documentos", count: cliente.documentosGerados.length + documentos.length },
    { key: "historico", label: "Histórico" },
  ];
  if (podeVerFinanceiro) {
    tabs.push({ key: "financeiro", label: "Financeiro", count: cliente.financeiros.length });
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/clientes" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para clientes
        </Link>
      </div>
      <Topbar
        title={cliente.apelido}
        subtitle="Detalhes do cliente"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/clientes/${id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <div ref={gerarRef} className="relative">
              <button
                type="button"
                onClick={() => setGerarOpen(!gerarOpen)}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                <FileText size={14} />
                Gerar
                <ChevronDownIcon size={12} />
              </button>
              {gerarOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[var(--color-paper-200)] bg-white py-1 shadow-lg">
                  {TEMPLATES.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/clientes/${id}/gerar/${t.slug}`}
                      onClick={() => setGerarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                    >
                      <FileText size={14} className="text-[var(--color-brand-500)]" />
                      <span>{t.nome}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          </div>
        }
      />

      {diasFimTrimestre <= 20 && diasFimTrimestre > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div className="text-sm text-amber-900">
              <span className="font-medium">DMR — {trimestreLabel}</span> — Faltam{" "}
              <strong>{diasFimTrimestre} dia(s)</strong> para o fim do trimestre.
              {cliente.empreendimentos.filter((e) => {
                const dmr = e.controleDmr;
                if (!dmr) return true;
                const tri = Math.floor(new Date().getMonth() / 3) + 1;
                const dmrField = `t${tri}Dmr` as keyof typeof dmr;
                const mtrField = `t${tri}Mtr` as keyof typeof dmr;
                return (dmr[dmrField] || "") !== "OK" || (dmr[mtrField] || "") !== "OK";
              }).length > 0 && (
                <span>
                  {" "}Há empreendimentos com pendências no controle DMR.
                </span>
              )}
            </div>
            <Link href="/dmr" className="ml-auto shrink-0 text-sm font-medium text-amber-700 hover:text-amber-800">
              Ver controle →
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6 border-b border-[var(--color-paper-200)]">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]"
                  : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-1.5 rounded px-1.5 py-0.5 text-xs ${
                  tab === t.key ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" : "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === "info" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Building2 size={16} />
                  <span className="text-[var(--color-ink-900)]">{cliente.razaoSocial}</span>
                </div>
                {cliente.nomeFantasia && (
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <FileText size={16} />
                    <span>{cliente.nomeFantasia}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Mail size={16} />
                  <span>{cliente.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Phone size={16} />
                  <span>{cliente.telefone}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <User size={16} />
                  <span>Resp.: {cliente.respLegal}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <FileText size={16} />
                  <span className="font-mono">{cliente.cnpj}</span>
                </div>
              </div>
            </div>

            {(cliente.rua || cliente.cep || cliente.municipio || cliente.uf) && (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={18} className="text-[var(--color-ink-500)]" />
                  <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Endereço</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {cliente.rua && <div className="col-span-2 text-[var(--color-ink-700)]">
                    {cliente.rua}{cliente.numero ? `, ${cliente.numero}` : ""}
                  </div>}
                  {cliente.bairro && <div className="text-[var(--color-ink-500)]">Bairro: {cliente.bairro}</div>}
                  {cliente.complemento && <div className="text-[var(--color-ink-500)]">Complemento: {cliente.complemento}</div>}
                  {cliente.cep && <div className="text-[var(--color-ink-500)]">CEP: {cliente.cep}</div>}
                  {cliente.municipio && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Map size={14} />{cliente.municipio}</div>}
                  {cliente.uf && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Globe size={14} />{cliente.uf}</div>}
                </div>
              </div>
            )}

            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Cadastro</h2>
              <p className="text-sm text-[var(--color-ink-500)]">
                {format(new Date(cliente.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Resumo</h2>
              <div className="space-y-3 text-sm">
                <Link href={`/empreendimentos?clienteId=${cliente.id}`} className="flex items-center justify-between rounded-lg border border-[var(--color-paper-200)] px-3 py-2 hover:bg-[var(--color-paper-100)]">
                  <span className="text-[var(--color-ink-600)]">Empreendimentos</span>
                  <span className="font-semibold text-[var(--color-ink-900)]">{cliente.empreendimentos.length}</span>
                </Link>
                {podeVerFinanceiro && (
                  <Link href={`/financeiro?clienteId=${cliente.id}`} className="flex items-center justify-between rounded-lg border border-[var(--color-paper-200)] px-3 py-2 hover:bg-[var(--color-paper-100)]">
                    <span className="text-[var(--color-ink-600)]">Financeiro</span>
                    <span className="font-semibold text-[var(--color-ink-900)]">{cliente.financeiros.length}</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Gerar Documentos</h2>
              <div className="space-y-2">
                {TEMPLATES.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/clientes/${id}/gerar/${t.slug}`}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                  >
                    <FileText size={14} className="text-[var(--color-brand-500)]" />
                    <span>{t.nome}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "empreendimentos" && (
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-paper-200)]">
            <h2 className="font-display text-base font-semibold">Empreendimentos</h2>
            <Link
              href={`/empreendimentos/novo`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={14} />
              Novo
            </Link>
          </div>
          {cliente.empreendimentos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-[var(--color-ink-500)]">
              <Building2 size={24} />
              <p className="text-sm">Nenhum empreendimento vinculado</p>
              <Link href={`/empreendimentos/novo`} className="text-sm text-[var(--color-brand-600)] hover:underline">
                Cadastrar empreendimento
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                    <th className="text-left p-4 font-medium">Apelido</th>
                    <th className="text-left p-4 font-medium">Endereço</th>
                    <th className="text-center p-4 font-medium">Processos</th>
                    <th className="text-center p-4 font-medium">DMR</th>
                    <th className="text-center p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.empreendimentos.map((emp) => {
                    const dmr = emp.controleDmr;
                    const tri = Math.floor(new Date().getMonth() / 3) + 1;
                    const dmrField = `t${tri}Dmr` as keyof typeof dmr;
                    const mtrField = `t${tri}Mtr` as keyof typeof dmr;
                    const dmrOk = dmr && (dmr[dmrField] || "") === "OK" && (dmr[mtrField] || "") === "OK";
                    return (
                      <tr key={emp.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                        <td className="p-4">
                          <Link href={`/empreendimentos/${emp.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)]">
                            {emp.apelido}
                          </Link>
                        </td>
                        <td className="p-4 max-w-xs truncate text-[var(--color-ink-500)]">
                          {[emp.rua, emp.numero, emp.bairro, emp.municipio].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="p-4 text-center">{emp._count.processos}</td>
                        <td className="p-4 text-center">
                          {dmr ? (
                            dmrOk
                              ? <CheckCircle2 size={16} className="text-green-600 mx-auto" aria-label="OK" />
                              : <Clock size={16} className="text-amber-500 mx-auto" aria-label="Pendente" />
                          ) : (
                            <span className="text-xs text-[var(--color-ink-400)]">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/empreendimentos/${emp.id}/editar`}
                              className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-brand-600)]"
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </Link>
                            <Link
                              href={`/empreendimentos/${emp.id}`}
                              className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-brand-600)]"
                              title="Detalhes"
                            >
                              <ExternalLink size={14} />
                            </Link>
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
      )}

      {tab === "documentos" && (
        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Fazer upload</h2>
              <button
                type="button"
                onClick={handleExportZip}
                disabled={exporting || (documentos.length === 0 && cliente.documentosGerados.length === 0)}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] disabled:opacity-50"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <FolderArchive size={14} />}
                {exporting ? "Exportando..." : "Exportar ZIP"}
              </button>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Arquivo</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-[var(--color-ink-700)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-brand-50)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-brand-600)] hover:file:bg-[var(--color-brand-100)]"
                />
                {uploadFile && <p className="mt-1 text-xs text-[var(--color-ink-500)]">{uploadFile.name}</p>}
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Nome (opcional)</label>
                <input
                  value={uploadNome}
                  onChange={(e) => setUploadNome(e.target.value)}
                  placeholder="Deixe em branco..."
                  className="w-full rounded-lg border border-[var(--color-paper-200)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Tipo</label>
                <select
                  value={uploadTipo}
                  onChange={(e) => setUploadTipo(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-paper-200)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                >
                  <option value="licenca">Licença</option>
                  <option value="parecer">Parecer</option>
                  <option value="oficio">Ofício</option>
                  <option value="laudo">Laudo</option>
                  <option value="relatorio">Relatório</option>
                  <option value="contrato">Contrato</option>
                  <option value="anexo">Anexo</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Enviando..." : "Upload"}
              </button>
            </div>
          </div>

          {documentos.length > 0 && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold mb-4">Documentos enviados</h2>
              <div className="space-y-2">
                {documentos.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[var(--color-paper-200)] pb-2 text-sm">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-[var(--color-ink-400)]" />
                      <span className="text-[var(--color-ink-700)]">{d.nome}</span>
                      <span className="text-xs text-[var(--color-ink-400)]">({(d.tamanho / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--color-ink-500)]">{format(new Date(d.criadoEm), "dd/MM/yyyy")}</span>
                      <a
                        href={d.caminho}
                        target="_blank"
                        className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-brand-600)]"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cliente.documentosGerados.length > 0 && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold mb-4">Documentos gerados</h2>
              <div className="space-y-2">
                {cliente.documentosGerados.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[var(--color-paper-200)] pb-2 text-sm">
                    <span className="text-[var(--color-ink-700)]">
                      {d.templateSlug === "pgrs-pinhais" ? "PGRS Pinhais"
                        : d.templateSlug === "pgrs-curitiba" ? "PGRS Curitiba"
                        : d.templateSlug}
                    </span>
                    <span className="text-xs text-[var(--color-ink-500)]">
                      {format(new Date(d.createdAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {documentos.length === 0 && cliente.documentosGerados.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-[var(--color-ink-500)]">
              <FileText size={24} />
              <p className="text-sm">Nenhum documento vinculado a este cliente.</p>
            </div>
          )}
        </div>
      )}

      {tab === "historico" && (
        <HistoricoTab clienteId={cliente.id} />
      )}

      {tab === "financeiro" && (
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-paper-200)]">
            <h2 className="font-display text-base font-semibold">Financeiro</h2>
            <Link
              href={`/financeiro/novo`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={14} />
              Novo
            </Link>
          </div>
          {cliente.financeiros.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-[var(--color-ink-500)]">
              <FileText size={24} />
              <p className="text-sm">Nenhum registro financeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                    <th className="text-left p-4 font-medium">Tipo</th>
                    <th className="text-right p-4 font-medium">Valor</th>
                    <th className="text-left p-4 font-medium">Pagamento</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.financeiros.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                      <td className="p-4">{r.tipoCobranca}</td>
                      <td className="p-4 text-right font-medium">
                        {r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="p-4 text-[var(--color-ink-500)]">{r.formaPagamento || "—"}</td>
                      <td className="p-4">
                        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[r.statusPagamento] || ""}`}>
                          {statusLabels[r.statusPagamento] || r.statusPagamento}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--color-ink-500)]">
                        {r.dataVencimento ? format(new Date(r.dataVencimento), "dd/MM/yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Excluir Cliente</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                  Tem certeza? Todos os empreendimentos, processos, documentos e dados vinculados serão removidos.
                </p>
              </div>
              <button onClick={() => setConfirmDelete(false)} className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]" disabled={deleting}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
