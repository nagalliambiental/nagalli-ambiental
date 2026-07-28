import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Inbox, Eye, AlertTriangle, Check, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PrazosPage() {
  const exigencias = await prisma.exigencia.findMany({
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
  });

  const now = new Date();

  return (
    <div>
      <Topbar
        title="Prazos"
        subtitle="Acompanhe os prazos de todas as exigências pendentes"
      />

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
