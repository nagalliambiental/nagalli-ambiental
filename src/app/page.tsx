import Link from "next/link";
import { Building2, CalendarClock, Plus, FileCheck2, FileSpreadsheet, LayoutDashboard, AlertTriangle, Truck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { prisma } from "@/lib/prisma";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getTrimestreAtual, getDiasFimTrimestre } from "@/lib/dmr-parser";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [
    totalProcessos,
    totalClientes,
    totalEmpreendimentos,
    exigenciasPendentes,
    processosComValidade,
    exigenciasComPrazo,
    tppsComValidade,
  ] = await Promise.all([
    prisma.processo.count(),
    prisma.cliente.count(),
    prisma.empreendimento.count(),
    prisma.exigencia.count({ where: { cumprida: false } }),
    prisma.processo.findMany({
      where: { validade: { not: null }, ativo: true, renovacaoPendente: false },
      include: { empreendimento: { select: { apelido: true } }, orgao: { select: { sigla: true } } },
      orderBy: { validade: "asc" },
    }),
    prisma.exigencia.findMany({
      where: { cumprida: false, processo: { renovacaoPendente: false } },
      include: { processo: { select: { numProtocolo: true, empreendimento: { select: { apelido: true } } } } },
      orderBy: { prazo: "asc" },
    }),
    prisma.autorizacaoTpp.findMany({
      where: { ativo: true },
      include: {
        cliente: { select: { apelido: true } },
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { dataValidade: "asc" },
    }),
  ]);

  const hoje = new Date();

  const alertasProcessos = processosComValidade
    .filter((p) => p.validade && differenceInDays(p.validade, hoje) <= p.alertaDias)
    .map((p) => ({
      id: p.id,
      tipo: p.tipo,
      numProtocolo: p.numProtocolo,
      apelido: p.empreendimento.apelido,
      orgao: p.orgao.sigla,
      validade: p.validade!,
      diasRestantes: differenceInDays(p.validade!, hoje),
    }));

  const alertasExigencias = exigenciasComPrazo
    .filter((e) => differenceInDays(e.prazo, hoje) <= 7)
    .map((e) => ({
      id: e.id,
      descricao: e.descricao,
      processo: e.processo.numProtocolo,
      apelido: e.processo.empreendimento.apelido,
      prazo: e.prazo,
      diasRestantes: differenceInDays(e.prazo, hoje),
    }));

  const totalAlertas = alertasProcessos.length + alertasExigencias.length;
  const diasDMR = getDiasFimTrimestre();
  const trimestre = getTrimestreAtual();
  const dmrUrgente = diasDMR <= 20;
  const tppAlertas = tppsComValidade.filter((t) => differenceInDays(t.dataValidade, hoje) <= 15);
  const tppVencidas = tppAlertas.filter((t) => differenceInDays(t.dataValidade, hoje) < 0).length;
  const tppAVencer = tppAlertas.length - tppVencidas;
  const tppPrecisaAtencao = tppAlertas.length > 0;

  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <Topbar
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Visao geral das licencas e cadastros"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/processos" className="block h-full">
          <StatCard label="Licencas Ativas" value={totalProcessos} icon={FileCheck2} accent="brand" />
        </Link>
        <Link href="/clientes" className="block h-full">
          <StatCard label="Clientes" value={totalClientes} icon={Building2} accent="river" />
        </Link>
        <Link href="/empreendimentos" className="block h-full">
          <StatCard label="Empreendimentos" value={totalEmpreendimentos} icon={Building2} accent="brand" />
        </Link>
        <Link href="/exigencias" className="block h-full">
          <StatCard label="Exigencias Pendentes" value={exigenciasPendentes} icon={CalendarClock} accent={exigenciasPendentes > 0 ? "river" : "brand"} />
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        <div className={`rounded-[var(--radius-card)] border p-5 ${dmrUrgente ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${dmrUrgente ? "bg-red-100" : "bg-amber-100"}`}>
                <FileSpreadsheet size={18} className={dmrUrgente ? "text-red-700" : "text-amber-700"} />
              </div>
              <div>
                <p className={`text-sm font-medium ${dmrUrgente ? "text-red-900" : "text-amber-900"}`}>
                  DMR — {trimestre.label}
                </p>
                <p className={`text-xs ${dmrUrgente ? "text-red-700" : "text-amber-700"}`}>
                  {diasDMR <= 0
                    ? "Trimestre encerrado! Regularize as pendencias."
                    : `Faltam ${diasDMR} dia(s) para o fim do trimestre.`}
                </p>
              </div>
            </div>
            <Link href="/dmr" className={`focus-ring transition-brand rounded-lg px-3 py-1.5 text-xs font-medium text-white ${dmrUrgente ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>
              Ver
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {totalAlertas > 0 && (
            <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-red-100 p-2">
                    <AlertTriangle size={18} className="text-red-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-900">Alertas de prazos ({totalAlertas})</p>
                    <p className="text-xs text-red-700">Licencas e exigencias com vencimento proximo ou vencido</p>
                  </div>
                </div>
                <Link href="/prazos" className="focus-ring transition-brand rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                  Ver todos
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {alertasProcessos.slice(0, 4).map((a) => (
                  <Link key={`p-${a.id}`} href={`/processos/${a.id}`} className={`focus-ring transition-brand flex items-center justify-between rounded-lg border bg-white p-3 ${a.diasRestantes < 0 ? "border-red-300" : "border-amber-200"}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{a.tipo} -- {a.apelido}</p>
                      <p className="text-xs text-[var(--color-ink-500)]">{a.numProtocolo} · {a.orgao}</p>
                    </div>
                    <div className={`shrink-0 text-right text-xs font-semibold ${a.diasRestantes < 0 ? "text-red-700" : "text-amber-700"}`}>
                      {format(a.validade, "dd/MM", { locale: ptBR })}
                      <div>{a.diasRestantes < 0 ? `${Math.abs(a.diasRestantes)}d atraso` : `${a.diasRestantes}d`}</div>
                    </div>
                  </Link>
                ))}
                {alertasExigencias.slice(0, 4).map((a) => (
                  <Link key={`e-${a.id}`} href={`/exigencias/${a.id}`} className={`focus-ring transition-brand flex items-center justify-between rounded-lg border bg-white p-3 ${a.diasRestantes < 0 ? "border-red-300" : "border-amber-200"}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{a.descricao}</p>
                      <p className="text-xs text-[var(--color-ink-500)]">{a.processo} · {a.apelido}</p>
                    </div>
                    <div className={`shrink-0 text-right text-xs font-semibold ${a.diasRestantes < 0 ? "text-red-700" : "text-amber-700"}`}>
                      {format(a.prazo, "dd/MM", { locale: ptBR })}
                      <div>{a.diasRestantes < 0 ? `${Math.abs(a.diasRestantes)}d atraso` : `${a.diasRestantes}d`}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tppsComValidade.length > 0 && (
            <div className={`rounded-[var(--radius-card)] border p-5 ${tppPrecisaAtencao ? "border-red-200 bg-red-50" : "border-[var(--color-paper-200)] bg-white"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${tppPrecisaAtencao ? "bg-red-100" : "bg-[var(--color-brand-50)]"}`}>
                    <Truck size={18} className={tppPrecisaAtencao ? "text-red-700" : "text-[var(--color-brand-600)]"} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${tppPrecisaAtencao ? "text-red-900" : "text-[var(--color-ink-900)]"}`}>
                      TPP — Produtos Perigosos ({tppsComValidade.length})
                    </p>
                    <p className={`text-xs ${tppPrecisaAtencao ? "text-red-700" : "text-[var(--color-ink-500)]"}`}>
                      {tppPrecisaAtencao
                        ? `${tppVencidas} vencida(s) · ${tppAVencer} a vencer em 15 dias`
                        : "Todas as autorizacoes vigentes"}
                    </p>
                  </div>
                </div>
                <Link href="/tpp" className={`focus-ring transition-brand rounded-lg px-3 py-1.5 text-xs font-medium text-white ${tppPrecisaAtencao ? "bg-red-600 hover:bg-red-700" : "bg-[var(--color-river-700)] hover:bg-[var(--color-river-500)]"}`}>
                  Ver
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {tppsComValidade.slice(0, 4).map((t) => {
                  const diff = differenceInDays(t.dataValidade, hoje);
                  return (
                    <Link key={t.id} href={`/tpp/${t.id}`} className="focus-ring transition-brand flex items-center justify-between rounded-lg border bg-white p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{t.cliente.apelido}</p>
                        <p className="truncate text-xs text-[var(--color-ink-500)]">TPP {t.numero} · {t.empreendimento?.apelido || "—"}</p>
                      </div>
                      <div className={`shrink-0 text-right text-xs font-semibold ${diff < 0 ? "text-red-700" : diff <= 15 ? "text-amber-700" : "text-[var(--color-brand-600)]"}`}>
                        {format(t.dataValidade, "dd/MM", { locale: ptBR })}
                        <div>{diff < 0 ? `${Math.abs(diff)}d atraso` : diff <= 15 ? `${diff}d` : "OK"}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
