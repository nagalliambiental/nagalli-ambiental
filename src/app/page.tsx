import Link from "next/link";
import { Building2, CalendarClock, Plus, Inbox, ArrowUpRight, AlertTriangle, FileCheck2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { prisma } from "@/lib/prisma";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

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
    processosPorStatus,
    processosVencendo,
    totalClientes,
    totalEmpreendimentos,
    exigenciasPendentes,
    clientesRecentes,
    processosRecentes,
  ] = await Promise.all([
    prisma.processo.count(),
    prisma.processo.groupBy({ by: ["status"], _count: true }),
    prisma.processo.findMany({
      where: {
        validade: { not: null, gte: new Date() },
      },
      include: { empreendimento: { select: { apelido: true } }, orgao: { select: { sigla: true } } },
      orderBy: { validade: "asc" },
    }),
    prisma.cliente.count(),
    prisma.empreendimento.count(),
    prisma.exigencia.count({ where: { cumprida: false } }),
    prisma.cliente.findMany({ take: 5, orderBy: { criadoEm: "desc" }, include: { _count: { select: { empreendimentos: true } } } }),
    prisma.processo.findMany({
      take: 20,
      orderBy: { criadoEm: "desc" },
      include: {
        empreendimento: { select: { apelido: true } },
        orgao: { select: { sigla: true } },
      },
    }),
  ]);

  const totalVencendo = processosVencendo.length;

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Visão geral dos processos e cadastros"
        actions={
          <Link
            href="/clientes/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} strokeWidth={2.5} />
            Novo cliente
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Processos Ativos" value={totalProcessos} icon={FileCheck2} accent="brand" />
        <StatCard label="Clientes" value={totalClientes} icon={Building2} accent="river" />
        <StatCard label="Empreendimentos" value={totalEmpreendimentos} icon={Building2} accent="brand" />
        <Link href="/exigencias" className="block h-full">
          <StatCard label="Exigências Pendentes" value={exigenciasPendentes} icon={CalendarClock} accent={exigenciasPendentes > 0 ? "river" : "brand"} />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
              Processos por Status
            </h2>
            <Link href="/processos" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-4">
            {processosPorStatus.map((s) => {
              const processosNoStatus = processosRecentes.filter((p) => p.status === s.status);
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[s.status] || ""}`}>
                        {statusLabels[s.status] || s.status}
                      </span>
                      <span className="text-xs text-[var(--color-ink-500)]">({s._count})</span>
                    </div>
                    {s._count > 0 && (
                      <Link href={`/processos?status=${s.status}`} className="text-xs text-[var(--color-brand-600)] hover:underline">
                        Filtrar
                      </Link>
                    )}
                  </div>
                  {processosNoStatus.length > 0 ? (
                    <div className="space-y-1 ml-1">
                      {processosNoStatus.slice(0, 3).map((p) => (
                        <Link key={p.id} href={`/processos/${p.id}`} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-[var(--color-paper-50)] transition-colors">
                          <span className="font-mono text-[var(--color-brand-600)]">{p.numProtocolo}</span>
                          <span className="text-xs text-[var(--color-ink-500)]">{p.empreendimento.apelido}</span>
                        </Link>
                      ))}
                      {s._count > 3 && (
                        <p className="text-xs text-[var(--color-ink-400)] pl-2">+ {s._count - 3} mais</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-ink-400)] pl-2">Nenhum</p>
                  )}
                </div>
              );
            })}
            {processosPorStatus.length === 0 && (
              <p className="text-sm text-[var(--color-ink-500)]">Nenhum processo cadastrado</p>
            )}
          </div>
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">
            Prazos a Vencer
          </h2>
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
                        <Link href={`/processos/${p.id}`} className="text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
                          {p.numProtocolo}
                        </Link>
                        <p className="text-xs text-[var(--color-ink-500)]">{p.empreendimento.apelido} - {p.orgao.sigla}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isUrgente ? "text-red-600" : "text-[var(--color-ink-700)]"}`}>
                          {p.validade ? format(p.validade, "dd/MM") : "—"}
                        </p>
                        <p className="text-xs text-[var(--color-ink-500)]">
                          {diasRestantes >= 0 ? `${diasRestantes} dias` : "Vencido"}
                        </p>
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
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
            Clientes recentes
          </h2>
          {totalClientes > 5 && (
            <Link href="/clientes" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
              Ver todos
            </Link>
          )}
        </div>
        <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          {clientesRecentes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-full bg-[var(--color-paper-100)] p-3">
                <Inbox size={22} className="text-[var(--color-ink-500)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-ink-900)]">
                  Nenhum cliente cadastrado ainda
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                  Cadastre o primeiro cliente para começar.
                </p>
              </div>
              <Link
                href="/clientes/novo"
                className="focus-ring transition-brand mt-2 flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                <Plus size={16} strokeWidth={2.5} />
                Novo cliente
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
