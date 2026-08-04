import Link from "next/link";
import { Building2, CalendarClock, Plus, Inbox, ArrowUpRight, FileCheck2, FileSpreadsheet, AlertTriangle, ClipboardList, BarChart3 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { prisma } from "@/lib/prisma";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getTrimestreAtual, getDiasFimTrimestre } from "@/lib/dmr-parser";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProcessosChart } from "@/components/dashboard/ProcessosChart";
import { CondicionantesChart } from "@/components/dashboard/CondicionantesChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado", em_andamento: "Em Andamento",
  exigencia_recebida: "Exigência Recebida", deferido: "Deferido",
  indeferido: "Indeferido", arquivado: "Arquivado",
};

const statusColors: Record<string, string> = {
  protocolado: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  em_andamento: "bg-amber-50 text-amber-800",
  exigencia_recebida: "bg-orange-50 text-orange-800",
  deferido: "bg-green-50 text-green-800",
  indeferido: "bg-red-50 text-red-800",
  arquivado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export default async function DashboardPage() {
  const [
    totalProcessos,
    processosVencendo,
    totalClientes,
    totalEmpreendimentos,
    exigenciasPendentes,
    totalCondicionantes,
    condicionantesPendentes,
    clientesRecentes,
    processosRecentes,
    processosPorStatus,
    condicionantesPorStatus,
  ] = await Promise.all([
    prisma.processo.count(),
    prisma.processo.findMany({
      where: { validade: { not: null, gte: new Date() } },
      include: { empreendimento: { select: { apelido: true } }, orgao: { select: { sigla: true } } },
      orderBy: { validade: "asc" },
    }),
    prisma.cliente.count(),
    prisma.empreendimento.count(),
    prisma.exigencia.count({ where: { cumprida: false } }),
    prisma.condicionante.count(),
    prisma.condicionante.count({ where: { status: { in: ["pendente", "em_andamento", "vencida"] } } }),
    prisma.cliente.findMany({ take: 5, orderBy: { criadoEm: "desc" }, include: { _count: { select: { empreendimentos: true } } } }),
    prisma.processo.findMany({
      take: 5,
      orderBy: { criadoEm: "desc" },
      include: { empreendimento: { select: { apelido: true } }, orgao: { select: { sigla: true } } },
    }),
    prisma.processo.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.condicionante.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const totalVencendo = processosVencendo.length;

  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <Topbar
        title="Dashboard"
        subtitle="Visão geral dos processos e cadastros"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/clientes/novo" className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
              <Plus size={16} strokeWidth={2.5} />
              Novo cliente
            </Link>
            <Link href="/processos/novo" className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-river-700)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-river-500)]">
              <Plus size={16} strokeWidth={2.5} />
              Novo processo
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Processos Ativos" value={totalProcessos} icon={FileCheck2} accent="brand" />
        <StatCard label="Clientes" value={totalClientes} icon={Building2} accent="river" />
        <StatCard label="Empreendimentos" value={totalEmpreendimentos} icon={Building2} accent="brand" />
        <Link href="/exigencias" className="block h-full">
          <StatCard label="Exigências Pendentes" value={exigenciasPendentes} icon={CalendarClock} accent={exigenciasPendentes > 0 ? "river" : "brand"} />
        </Link>
        <Link href="/condicionantes" className="block h-full">
          <StatCard label="Condicionantes Pendentes" value={condicionantesPendentes} icon={ClipboardList} accent={condicionantesPendentes > 0 ? "river" : "brand"} hint={`${totalCondicionantes} total`} />
        </Link>
      </div>

      {(() => {
        const dias = getDiasFimTrimestre();
        const tri = getTrimestreAtual();
        const isUrgent = dias <= 20;
        return (
          <div className={`mt-6 rounded-[var(--radius-card)] border p-4 ${isUrgent ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${isUrgent ? "bg-red-100" : "bg-amber-100"}`}>
                  <FileSpreadsheet size={18} className={isUrgent ? "text-red-700" : "text-amber-700"} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isUrgent ? "text-red-900" : "text-amber-900"}`}>
                    DMR — {tri.label} ({tri.inicio} a {tri.fim})
                  </p>
                  <p className={`text-xs ${isUrgent ? "text-red-700" : "text-amber-700"}`}>
                    {dias <= 0
                      ? "O trimestre encerrou! Regularize as pendências."
                      : `Faltam ${dias} dia(s) para o fim do trimestre.${dias <= 20 ? " Acompanhe os empreendimentos pendentes." : ""}`
                    }
                  </p>
                </div>
              </div>
              <Link href="/dmr" className={`focus-ring transition-brand rounded-lg px-4 py-2 text-sm font-medium text-white ${isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>
                Ver controle
              </Link>
            </div>
          </div>
        );
      })()}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">
            <BarChart3 size={18} />
            Processos por Status
          </h2>
          <ProcessosChart data={processosPorStatus.map((s) => ({ name: statusLabels[s.status] || s.status, value: s._count.id }))} />
        </div>
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">
            <ClipboardList size={18} />
            Condicionantes por Status
          </h2>
          <CondicionantesChart data={condicionantesPorStatus.map((s) => ({ name: statusLabels[s.status] || s.status, value: s._count.id }))} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Últimos Processos</h2>
            <Link href="/processos" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">Ver todos</Link>
          </div>
          {processosRecentes.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                  <th className="text-left px-5 py-2 font-medium">Tipo</th>
                  <th className="text-left px-5 py-2 font-medium">Empreendimento</th>
                  <th className="text-left px-5 py-2 font-medium">Status</th>
                  <th className="text-left px-5 py-2 font-medium">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {processosRecentes.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-paper-50)] hover:bg-[var(--color-paper-50)]">
                    <td className="px-5 py-3">
                      <Link href={`/processos/${p.id}`} className="font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">{p.tipo}</Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-700)]">{p.empreendimento.apelido}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || ""}`}>{statusLabels[p.status] || p.status}</span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{p.validade ? format(p.validade, "dd/MM/yyyy", { locale: ptBR }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-full bg-[var(--color-paper-100)] p-3"><FileCheck2 size={22} className="text-[var(--color-ink-500)]" /></div>
              <p className="text-sm text-[var(--color-ink-500)]">Nenhum processo cadastrado</p>
            </div>
          )}
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Prazos a Vencer</h2>
          <div className="space-y-3">
            {(() => {
              const now = new Date();
              const vencendo = processosVencendo.filter((p) => {
                if (!p.validade) return false;
                const diasRestantes = differenceInDays(p.validade, now);
                return diasRestantes <= p.alertaDias;
              });
              return vencendo.length > 0 ? (
                vencendo.map((p) => {
                  const diasRestantes = p.validade ? differenceInDays(p.validade, now) : 0;
                  const isUrgente = diasRestantes <= 7;
                  return (
                    <div key={p.id} className="flex items-center justify-between border-b border-[var(--color-paper-100)] pb-2 last:border-0">
                      <div>
                        <Link href={`/processos/${p.id}`} className="text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">{p.numProtocolo}</Link>
                        <p className="text-xs text-[var(--color-ink-500)]">{p.empreendimento.apelido} - {p.orgao.sigla}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isUrgente ? "text-red-600" : "text-[var(--color-ink-700)]"}`}>{p.validade ? format(p.validade, "dd/MM") : "—"}</p>
                        <p className="text-xs text-[var(--color-ink-500)]">{diasRestantes >= 0 ? `${diasRestantes} dias` : "Vencido"}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--color-ink-500)]">Nenhum prazo próximo do vencimento</p>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Clientes recentes</h2>
          {totalClientes > 5 && <Link href="/clientes" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">Ver todos</Link>}
        </div>
        <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          {clientesRecentes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-full bg-[var(--color-paper-100)] p-3"><Inbox size={22} className="text-[var(--color-ink-500)]" /></div>
              <p className="text-sm font-medium text-[var(--color-ink-900)]">Nenhum cliente cadastrado ainda</p>
              <Link href="/clientes/novo" className="focus-ring transition-brand mt-2 flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
                <Plus size={16} strokeWidth={2.5} />Novo cliente
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-paper-100)]">
              {clientesRecentes.map((c) => (
                <Link key={c.id} href={`/clientes/${c.id}`} className="focus-ring transition-brand flex items-center justify-between px-6 py-4 hover:bg-[var(--color-paper-50)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink-900)]">{c.apelido}</p>
                    <p className="text-xs text-[var(--color-ink-500)]">{c.razaoSocial} · {c.cnpj}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-ink-500)]">{c._count.empreendimentos} empreendimento(s)</span>
                    <ArrowUpRight size={14} className="text-[var(--color-ink-300)]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
