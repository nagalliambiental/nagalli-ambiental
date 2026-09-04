import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatCard } from "@/components/StatCard";
import { FolderKanban, Plus, Clock3, FileText, Archive } from "lucide-react";
import { FilterSelect } from "@/components/FilterSelect";
import { ProcessosTable } from "@/components/tables/ProcessosTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Licenças" };

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tab?: string }>;
}) {
  const { status, tab } = await searchParams;

  const where: Prisma.ProcessoWhereInput = {};
  if (tab === "encerradas") {
    where.OR = [{ status: "encerrado" }, { renovacaoPendente: true }];
  } else {
    if (status) {
      where.status = status;
    } else {
      where.status = { not: "encerrado" };
      where.renovacaoPendente = false;
    }
  }

  const processos = await prisma.processo.findMany({
    where,
    include: {
      orgao: { select: { sigla: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const totalEncerradas = await prisma.processo.count({
    where: { OR: [{ status: "encerrado" }, { renovacaoPendente: true }], ativo: true },
  });
  const [protocolados, emAndamento] = await Promise.all([
    prisma.processo.count({ where: { status: "protocolado", ativo: true } }),
    prisma.processo.count({ where: { status: "em_andamento", ativo: true } }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Licenças" }]} />
      <Topbar
        icon={FolderKanban}
        title="Licenças"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              paramName="status"
              options={[
                { value: "", label: "Todos os status" },
                { value: "protocolado", label: "Protocolado" },
                { value: "em_andamento", label: "Em Andamento" },
                { value: "exigencia_recebida", label: "Exigência Recebida" },
                { value: "deferido", label: "Deferido" },
                { value: "indeferido", label: "Indeferido" },
                { value: "arquivado", label: "Arquivado" },
              ]}
            />
            <Link
              href="/processos/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Licença
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Licenças na lista" value={processos.length} icon={FolderKanban} />
        <StatCard label="Em andamento" value={emAndamento} icon={Clock3} accent="river" />
        <StatCard label="Protocolados" value={protocolados} icon={FileText} />
        <StatCard label="Encerradas" value={totalEncerradas} icon={Archive} accent="success" />
      </div>
      <div className="mb-4 flex gap-2 border-b border-[var(--color-paper-200)]">
        <Link
          href="/processos"
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab !== "encerradas"
              ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]"
              : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
          }`}
        >
          Ativos
        </Link>
        <Link
          href="/processos?tab=encerradas"
          className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "encerradas"
              ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]"
              : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
          }`}
        >
          <Archive size={14} />
          Encerradas
          {totalEncerradas > 0 && (
            <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${tab === "encerradas" ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" : "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
              {totalEncerradas}
            </span>
          )}
        </Link>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ProcessosTable data={processos} />
      </div>
    </div>
  );
}
