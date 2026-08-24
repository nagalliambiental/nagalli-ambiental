import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, ClipboardCheck, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { TarefasTable } from "@/components/tables/TarefasTable";
import { StatCard } from "@/components/StatCard";
import { FilterSelect } from "@/components/FilterSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tarefas" };

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where: Prisma.TarefaWhereInput = {};
  if (status) {
    where.status = status;
  }

  const tarefas = await prisma.tarefa.findMany({
    where,
    include: {
      responsavel: { select: { nome: true } },
      usuario: { select: { nome: true } },
    },
    orderBy: [
      { status: "asc" },
      { prioridade: "desc" },
      { dataVencimento: "asc" },
    ],
  });

  const agora = new Date();
  const pendentes = tarefas.filter((t) => t.status === "pendente").length;
  const concluidas = tarefas.filter((t) => t.status === "concluido").length;
  const atrasadas = tarefas.filter(
    (t) => t.dataVencimento !== null && t.dataVencimento < agora && t.status !== "concluido",
  ).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Tarefas" }]} />
      <Topbar
        icon={ClipboardCheck}
        title="Tarefas"
        actions={
          <div className="flex items-center gap-3">
            <FilterSelect
              paramName="status"
              options={[
                { value: "pendente", label: "Pendente" },
                { value: "andamento", label: "Em Andamento" },
                { value: "aguardando", label: "Aguardando" },
                { value: "concluido", label: "Concluído" },
              ]}
            />
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
        <StatCard label="Na lista" value={tarefas.length} icon={ClipboardCheck} accent="brand" />
        <StatCard label="Pendentes" value={pendentes} icon={Clock} accent="warning" />
        <StatCard label="Concluídas" value={concluidas} icon={CheckCircle2} accent="success" />
        <StatCard label="Atrasadas" value={atrasadas} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <TarefasTable data={tarefas} />
      </div>
    </div>
  );
}
