import { prisma } from "@/lib/prisma";
import { listarResponsaveis } from "@/lib/responsaveis";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, ClipboardCheck, Clock, CheckCircle2, AlertTriangle, FileDown, FileUp, ExternalLink } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { STATUS_TAREFA } from "@/lib/constants";
import { LinhaTarefa, type LinhaTarefaTarefa, type OpcaoProcesso } from "@/components/tarefas/LinhaTarefa";
import { FiltroTarefas } from "@/components/tarefas/FiltroTarefas";
import { ImportarTarefasXlsx } from "@/components/tarefas/ImportarTarefasXlsx";
import { TarefaEmMassaModal } from "@/components/tarefas/TarefaEmMassaModal";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tarefas" };

const ABAS = [
  { value: "", label: "Todas" },
  { value: STATUS_TAREFA.NAO_INICIADO, label: "Não iniciadas" },
  { value: STATUS_TAREFA.EM_ANDAMENTO, label: "Em andamento" },
  { value: STATUS_TAREFA.PARA_REVISAO, label: "Para revisão" },
  { value: STATUS_TAREFA.CONCLUIDA, label: "Concluídas" },
];

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; responsavelId?: string }>;
}) {
  const { q, status, responsavelId } = await searchParams;

  const [todas, responsaveis, empreendimentos, processos] = await Promise.all([
    prisma.tarefa.findMany({
      where: { ativo: true },
      include: {
        responsavel: { select: { id: true, nome: true } },
        usuario: { select: { id: true, nome: true } },
        empreendimento: { select: { id: true, apelido: true } },
        processo: { select: { id: true, numProtocolo: true, numLicenca: true } },
        condicionante: { select: { id: true, titulo: true } },
        serie: { select: { recorrencia: true } },
        _count: { select: { anexos: true } },
      },
      orderBy: [{ prazoFinal: { sort: "asc", nulls: "last" } }, { criadoEm: "desc" }],
      take: 3000,
    }),
    listarResponsaveis(),
    prisma.empreendimento.findMany({ orderBy: { apelido: "asc" }, select: { id: true, apelido: true } }),
    prisma.processo.findMany({
      where: { ativo: true },
      orderBy: [{ criadoEm: "desc" }],
      select: {
        id: true,
        numProtocolo: true,
        numLicenca: true,
        empreendimentoId: true,
        empreendimento: { select: { id: true, apelido: true } },
      },
    }),
  ]);

  const termo = q?.trim().toLowerCase();
  const filtradas = todas.filter((t) => {
    if (status && t.status !== status) return false;
    if (responsavelId && t.responsavelId !== Number(responsavelId)) return false;
    if (termo) {
      const alvo = `${t.titulo} ${t.descricao ?? ""} ${t.observacoes ?? ""}`.toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });

  const agora = new Date();
  const contagem = (s: string) => todas.filter((t) => t.status === s).length;
  const concluidas = contagem(STATUS_TAREFA.CONCLUIDA);
  const emAberto = todas.length - concluidas;
  const atrasadas = todas.filter(
    (t) => t.status !== STATUS_TAREFA.CONCLUIDA && t.prazoFinal !== null && t.prazoFinal < agora
  ).length;

  const tarefas = JSON.parse(JSON.stringify(filtradas)) as LinhaTarefaTarefa[];
  const processosOpcoes = JSON.parse(JSON.stringify(processos)) as OpcaoProcesso[];

  function linkAba(value: string): string {
    const p = new URLSearchParams();
    if (value) p.set("status", value);
    if (q) p.set("q", q);
    if (responsavelId) p.set("responsavelId", responsavelId);
    const qs = p.toString();
    return `/tarefas${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Tarefas" }]} />
      <Topbar
        icon={ClipboardCheck}
        title="Tarefas"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/relatorios/tarefas"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring transition-brand inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              title="Exportar relatório em PDF"
            >
              <FileDown size={15} />
              <span className="hidden sm:inline">Relatório PDF</span>
            </a>
            <a
              href="/api/relatorios/tarefas?formato=xlsx"
              className="focus-ring transition-brand inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              title="Exportar relatório em Excel"
            >
              <FileUp size={15} />
              <span className="hidden sm:inline">Relatório XLSX</span>
            </a>
            <ImportarTarefasXlsx />
            <TarefaEmMassaModal processos={processosOpcoes} responsaveis={responsaveis} />
            <Link
              href="/tarefas/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Tarefa
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Em aberto" value={emAberto} icon={Clock} accent="warning" />
        <StatCard label="Total na lista" value={todas.length} icon={ClipboardCheck} accent="brand" />
        <StatCard label="Concluídas" value={concluidas} icon={CheckCircle2} accent="success" />
        <StatCard label="Atrasadas" value={atrasadas} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-paper-200)] px-4 pt-3">
          <nav className="flex flex-wrap gap-x-5">
            {ABAS.map((aba) => {
              const ativa = (status ?? "") === aba.value;
              const total = aba.value ? contagem(aba.value) : todas.length;
              return (
                <Link
                  key={aba.value || "todas"}
                  href={linkAba(aba.value)}
                  className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                    ativa
                      ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]"
                      : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
                  }`}
                >
                  {aba.label}
                  <span
                    className={`ml-1.5 rounded px-1.5 py-0.5 text-xs ${
                      ativa ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" : "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"
                    }`}
                  >
                    {total}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="pb-2">
            <FiltroTarefas responsaveis={responsaveis} responsavelAtual={responsavelId ?? ""} />
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-500)]">
            Nenhuma tarefa encontrada.{" "}
            <Link href="/tarefas/novo" className="font-medium text-[var(--color-brand-600)] hover:underline">
              Criar a primeira tarefa
            </Link>
          </div>
        ) : (
          <div>
            {tarefas.map((t) => (
              <LinhaTarefa
                key={t.id}
                tarefa={t}
                responsaveis={responsaveis}
                empreendimentos={empreendimentos}
                processos={processosOpcoes}
              />
            ))}
            {tarefas.length >= 3000 && (
              <p className="border-t border-[var(--color-paper-100)] px-5 py-3 text-center text-xs text-[var(--color-ink-500)]">
                Mostrando as 3.000 primeiras tarefas. Refine a busca para ver os demais registros.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]">
        <ExternalLink size={12} />
        <Link href="/relatorios" className="hover:text-[var(--color-brand-600)] hover:underline">
          Ver todos os relatórios
        </Link>
      </p>
    </div>
  );
}
