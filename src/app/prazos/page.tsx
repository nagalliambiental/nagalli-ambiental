import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Inbox, Eye, AlertTriangle, Check, CalendarClock, Clock, Settings2 } from "lucide-react";
import { AlertaDiasEditor } from "@/components/AlertaDiasEditor";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prazos" };

export default async function PrazosPage() {
  const now = new Date();

  const [exigencias, processosComValidade] = await Promise.all([
    prisma.exigencia.findMany({
      where: { cumprida: false },
      include: {
        processo: {
          select: {
            id: true,
            numProtocolo: true,
            tipo: true,
            orgao: { select: { sigla: true } },
            empreendimento: {
              select: { apelido: true, cliente: { select: { apelido: true } } },
            },
          },
        },
      },
      orderBy: { prazo: "asc" },
    }),
    prisma.processo.findMany({
      where: { validade: { not: null } },
      include: {
        orgao: { select: { sigla: true } },
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { validade: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Prazos" }]} />
      <Topbar
        title="Prazos"
        subtitle="Acompanhe os prazos de processos e exigências"
      />

      {processosComValidade.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">
            <CalendarClock size={18} />
            Prazos de Processos
          </h2>
          <div className="grid gap-3">
            {processosComValidade.map((p) => {
              if (!p.validade) return null;
              const diasRestantes = differenceInDays(p.validade, now);
              const isVencido = diasRestantes < 0;
              const isAlert = !isVencido && diasRestantes <= p.alertaDias;

              return (
                <div
                  key={p.id}
                  className={`shadow-card rounded-[var(--radius-card)] border bg-white p-4 ${
                    isVencido
                      ? "border-[var(--color-river-700)] bg-[var(--color-river-100)]"
                      : isAlert
                        ? "border-amber-200 bg-amber-50"
                        : "border-[var(--color-paper-200)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/processos/${p.id}`} className="font-mono text-sm font-semibold text-[var(--color-brand-600)] hover:underline">
                          {p.numProtocolo}
                        </Link>
                        {isVencido && (
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--color-river-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-river-700)]">
                            <AlertTriangle size={12} />
                            Vencido
                          </span>
                        )}
                        {isAlert && !isVencido && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Clock size={12} />
                            Alerta
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-ink-500)]">
                        {p.orgao.sigla} · {p.empreendimento.apelido}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`text-right text-sm font-semibold ${isVencido ? "text-[var(--color-river-700)]" : isAlert ? "text-amber-700" : "text-[var(--color-ink-700)]"}`}>
                        {format(p.validade, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-[var(--color-ink-500)]">
                        {isVencido
                          ? `Vencido há ${Math.abs(diasRestantes)} dias`
                          : `${diasRestantes} dias restantes`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-paper-100)] pt-3">
                    <Settings2 size={14} className="text-[var(--color-ink-400)]" />
                    <span className="text-xs text-[var(--color-ink-500)]">Alerta:</span>
                    <AlertaDiasEditor processoId={p.id} currentValue={p.alertaDias} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">
        <AlertTriangle size={18} />
        Exigências Pendentes
      </h2>

      {exigencias.length > 0 ? (
        <div className="grid gap-4">
          {exigencias.map((e) => {
            const diasRestantes = differenceInDays(e.prazo, now);
            const isVencido = diasRestantes < 0;
            const isUrgente = diasRestantes >= 0 && diasRestantes <= 7;

            return (
              <div
                key={e.id}
                className={`shadow-card rounded-[var(--radius-card)] border bg-white p-5 ${
                  isVencido
                    ? "border-[var(--color-river-700)]"
                    : isUrgente
                      ? "border-[var(--color-river-100)]"
                      : "border-[var(--color-paper-200)]"
                } ${isVencido ? "bg-[var(--color-river-100)]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
                        {e.descricao}
                      </h3>
                      {isVencido && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-river-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-river-700)]">
                          <AlertTriangle size={12} />
                          Vencido
                        </span>
                      )}
                      {isUrgente && !isVencido && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-river-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-river-700)]">
                          <CalendarClock size={12} />
                          Urgente
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-ink-500)]">
                      <span>Processo: <span className="font-mono text-[var(--color-ink-700)]">{e.processo.numProtocolo}</span></span>
                      <span>Órgão: <span className="text-[var(--color-ink-700)]">{e.processo.orgao.sigla}</span></span>
                      <span>Empreendimento: <span className="text-[var(--color-ink-700)]">{e.processo.empreendimento.apelido}</span></span>
                      <span>Cliente: <span className="text-[var(--color-ink-700)]">{e.processo.empreendimento.cliente.apelido}</span></span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`text-right ${isVencido ? "text-[var(--color-river-700)]" : isUrgente ? "text-[var(--color-river-700)]" : "text-[var(--color-ink-700)]"}`}>
                      <p className="font-display text-lg font-semibold">
                        {format(e.prazo, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs">
                        {isVencido
                          ? `Vencido há ${Math.abs(diasRestantes)} dias`
                          : `${diasRestantes} dias restantes`}
                      </p>
                    </div>
                    <Link
                      href={`/exigencias/${e.id}`}
                      className="focus-ring transition-brand inline-flex items-center gap-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                    >
                      <Eye size={12} />
                      Ver Exigência
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-[var(--color-ink-500)]">
          <div className="rounded-lg bg-[var(--color-paper-100)] p-4">
            <Check size={28} />
          </div>
          <p className="font-display text-lg font-medium text-[var(--color-ink-900)]">
            Todas as exigências foram cumpridas
          </p>
          <p className="text-sm">Nenhum prazo pendente no momento</p>
        </div>
      )}
    </div>
  );
}
