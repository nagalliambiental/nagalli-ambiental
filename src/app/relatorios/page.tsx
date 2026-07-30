"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { useSession } from "next-auth/react";
import { FileSpreadsheet, DollarSign, Building2, FileCheck2, Download, Loader2, Eye } from "lucide-react";

const currentYear = new Date().getFullYear();

function useDownload(url: string) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = url.split("?")[0].split("/").pop() + ".pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }

  return { download, loading };
}

function preview(url: string) {
  window.open(url, "_blank");
}

function Card({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--color-brand-50)] p-2.5">
          <Icon size={20} className="text-[var(--color-brand-600)]" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">{title}</h2>
          <p className="text-sm text-[var(--color-ink-500)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function RelatoriosPage() {
  const { data: session } = useSession();
  const perfil = (session?.user as { perfil?: string })?.perfil;
  const podeVerFinanceiro = perfil === "socio" || perfil === "admin";

  const [ano, setAno] = useState(currentYear);
  const [finStatus, setFinStatus] = useState("");
  const [procStatus, setProcStatus] = useState("");
  const dmr = useDownload(`/api/relatorios/dmr?ano=${ano}`);
  const financeiro = useDownload(`/api/relatorios/financeiro?status=${finStatus}`);
  const processos = useDownload(`/api/relatorios/processos?status=${procStatus}`);
  const clientes = useDownload("/api/relatorios/clientes");

  return (
    <div>
      <Topbar title="Relatórios" subtitle="Exporte relatórios em PDF" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card icon={FileSpreadsheet} title="Relatório DMR" description="Situação DMR/MTR por empreendimento e trimestre">
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Ano</label>
            <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))}
              className="w-32 rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => preview(`/api/relatorios/dmr?ano=${ano}`)}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              <Eye size={16} /> Visualizar
            </button>
            <button onClick={dmr.download} disabled={dmr.loading}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {dmr.loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {dmr.loading ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </Card>

        {podeVerFinanceiro && <Card icon={DollarSign} title="Relatório Financeiro" description="Registros financeiros com totais">
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Status</label>
            <select value={finStatus} onChange={(e) => setFinStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => preview(`/api/relatorios/financeiro?status=${finStatus}`)}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              <Eye size={16} /> Visualizar
            </button>
            <button onClick={financeiro.download} disabled={financeiro.loading}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {financeiro.loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {financeiro.loading ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </Card>}

        <Card icon={FileCheck2} title="Relatório de Processos" description="Lista de processos com status e prazos">
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Status</label>
            <select value={procStatus} onChange={(e) => setProcStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Todos</option>
              <option value="protocolado">Protocolado</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="exigencia_recebida">Exigência Recebida</option>
              <option value="deferido">Deferido</option>
              <option value="indeferido">Indeferido</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => preview(`/api/relatorios/processos?status=${procStatus}`)}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              <Eye size={16} /> Visualizar
            </button>
            <button onClick={processos.download} disabled={processos.loading}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {processos.loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {processos.loading ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </Card>

        <Card icon={Building2} title="Relatório de Clientes" description="Lista completa de clientes cadastrados">
          <div className="flex gap-2">
            <button onClick={() => preview("/api/relatorios/clientes")}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              <Eye size={16} /> Visualizar
            </button>
            <button onClick={clientes.download} disabled={clientes.loading}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {clientes.loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {clientes.loading ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
