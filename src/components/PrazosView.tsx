"use client";

import { useState } from "react";
import { List, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface ProcessoPrazo {
  id: number;
  numProtocolo: string;
  tipo: string;
  validade: string;
  alertaDias: number;
  orgao: { sigla: string };
  empreendimento: { apelido: string };
}

interface ExigenciaPrazo {
  id: number;
  descricao: string;
  prazo: string;
  processo: { id: number; numProtocolo: string; tipo: string; orgao: { sigla: string }; empreendimento: { apelido: string; cliente: { apelido: string } } };
}

export function PrazosView({ processos, exigencias }: { processos: ProcessoPrazo[]; exigencias: ExigenciaPrazo[] }) {
  const [view, setView] = useState<"lista" | "calendario">("lista");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("lista")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === "lista" ? "bg-[var(--color-brand-500)] text-white" : "border border-[var(--color-paper-200)] text-[var(--color-ink-600)] hover:bg-[var(--color-paper-50)]"}`}
        >
          <List size={14} /> Lista
        </button>
        <button
          onClick={() => setView("calendario")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === "calendario" ? "bg-[var(--color-brand-500)] text-white" : "border border-[var(--color-paper-200)] text-[var(--color-ink-600)] hover:bg-[var(--color-paper-50)]"}`}
        >
          <CalendarIcon size={14} /> Calendário
        </button>
      </div>

      {view === "lista" ? (
        <ListView processos={processos} exigencias={exigencias} />
      ) : (
        <CalendarView processos={processos} exigencias={exigencias} />
      )}
    </div>
  );
}

function ListView({ processos, exigencias }: { processos: ProcessoPrazo[]; exigencias: ExigenciaPrazo[] }) {
  const now = new Date();

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div>
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">
          <CalendarIcon size={18} />
          Prazos de Licenças
        </h2>
        {processos.length > 0 ? (
          <div className="grid gap-3">
            {processos.map((p) => {
              const validade = new Date(p.validade);
              const diasRestantes = differenceInDays(validade, now);
              const isVencido = diasRestantes < 0;
              const isAlert = !isVencido && diasRestantes <= p.alertaDias;

              return (
                <div key={p.id} className={`shadow-card rounded-[var(--radius-card)] border bg-white p-4 ${isVencido ? "border-red-300 bg-red-50" : isAlert ? "border-amber-200 bg-amber-50" : "border-[var(--color-paper-200)]"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/processos/${p.id}`} className="font-mono text-sm font-semibold text-[var(--color-brand-600)] hover:underline">{p.numProtocolo}</Link>
                        {isVencido && <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Vencido</span>}
                        {isAlert && !isVencido && <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Alerta</span>}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-ink-500)]">{p.tipo} · {p.orgao.sigla} · {p.empreendimento.apelido}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`text-right text-sm font-semibold ${isVencido ? "text-red-700" : isAlert ? "text-amber-700" : "text-[var(--color-ink-700)]"}`}>
                        {format(validade, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-[var(--color-ink-500)]">
                        {isVencido ? `Vencido há ${Math.abs(diasRestantes)} dias` : `${diasRestantes} dias restantes`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-[var(--color-ink-500)]">
            <p className="font-display text-base font-medium text-[var(--color-ink-900)]">Nenhum processo com prazo</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">Exigências Pendentes</h2>

        {exigencias.length > 0 ? (
          <div className="grid gap-4">
            {exigencias.map((e) => {
              const prazo = new Date(e.prazo);
              const diasRestantes = differenceInDays(prazo, now);
              const isVencido = diasRestantes < 0;
              const isUrgente = diasRestantes >= 0 && diasRestantes <= 7;

              return (
                <div key={e.id} className={`shadow-card rounded-[var(--radius-card)] border bg-white p-5 ${isVencido ? "border-red-300 bg-red-50" : isUrgente ? "border-amber-200" : "border-[var(--color-paper-200)]"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">{e.descricao}</h3>
                        {isVencido && <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Vencido</span>}
                        {isUrgente && !isVencido && <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Urgente</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-ink-500)]">
                        <span>Processo: <span className="font-mono text-[var(--color-ink-700)]">{e.processo.numProtocolo}</span></span>
                        <span>Tipo: <span className="text-[var(--color-ink-700)]">{e.processo.tipo}</span></span>
                        <span>Órgão: <span className="text-[var(--color-ink-700)]">{e.processo.orgao.sigla}</span></span>
                        <span>Empreendimento: <span className="text-[var(--color-ink-700)]">{e.processo.empreendimento.apelido}</span></span>
                        <span>Cliente: <span className="text-[var(--color-ink-700)]">{e.processo.empreendimento.cliente.apelido}</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`text-right ${isVencido ? "text-red-700" : "text-[var(--color-ink-700)]"}`}>
                        <p className="font-display text-lg font-semibold">{format(prazo, "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-xs">{isVencido ? `Vencido há ${Math.abs(diasRestantes)} dias` : `${diasRestantes} dias restantes`}</p>
                      </div>
                      <Link href={`/exigencias/${e.id}`} className="focus-ring transition-brand inline-flex items-center gap-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                        Ver Exigência
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-[var(--color-ink-500)]">
            <p className="font-display text-base font-medium text-[var(--color-ink-900)]">Todas as exigências foram cumpridas</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarView({ processos, exigencias }: { processos: ProcessoPrazo[]; exigencias: ExigenciaPrazo[] }) {
  const now = new Date();
  const [mesAtual, setMesAtual] = useState(() => startOfMonth(now));
  const monthStart = startOfMonth(mesAtual);
  const monthEnd = endOfMonth(mesAtual);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);
  const isMesAtual = isSameMonth(mesAtual, now);

  const allEvents: { date: Date; label: string; href: string; type: "processo" | "exigencia"; vencido: boolean }[] = [
    ...processos.map((p) => ({ date: new Date(p.validade), label: `Proc: ${p.numProtocolo}`, href: `/processos/${p.id}`, type: "processo" as const, vencido: differenceInDays(new Date(p.validade), now) < 0 })),
    ...exigencias.map((e) => ({ date: new Date(e.prazo), label: `Exig: ${e.descricao.substring(0, 30)}`, href: `/exigencias/${e.id}`, type: "exigencia" as const, vencido: differenceInDays(new Date(e.prazo), now) < 0 })),
  ];

  const getEventsForDay = (day: Date) => allEvents.filter((ev) => isSameDay(ev.date, day));

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMesAtual((m) => addMonths(m, -1))}
          className="focus-ring transition-brand flex items-center gap-1 rounded-lg border border-[var(--color-paper-200)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          title="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] capitalize">
          {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-2">
          {!isMesAtual && (
            <button
              type="button"
              onClick={() => setMesAtual(startOfMonth(now))}
              className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Hoje
            </button>
          )}
          <button
            type="button"
            onClick={() => setMesAtual((m) => addMonths(m, 1))}
            className="focus-ring transition-brand flex items-center gap-1 rounded-lg border border-[var(--color-paper-200)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            title="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--color-paper-200)]">
        {dayNames.map((name) => (
          <div key={name} className="bg-[var(--color-paper-50)] p-2 text-center text-xs font-medium text-[var(--color-ink-500)]">
            {name}
          </div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white p-2 min-h-[80px]" />
        ))}
        {days.map((day) => {
          const events = getEventsForDay(day);
          const isToday = isSameDay(day, now);
          return (
            <div key={day.toISOString()} className={`bg-white p-1.5 min-h-[80px] ${isToday ? "ring-2 ring-inset ring-[var(--color-brand-500)]" : ""}`}>
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-[var(--color-brand-600)]" : "text-[var(--color-ink-500)]"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {events.slice(0, 3).map((ev, idx) => (
                  <a key={idx} href={ev.href} className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium ${ev.vencido ? "bg-red-100 text-red-700" : "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"}`}>
                    {ev.label}
                  </a>
                ))}
                {events.length > 3 && <div className="text-[10px] text-[var(--color-ink-400)] px-1">+{events.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
