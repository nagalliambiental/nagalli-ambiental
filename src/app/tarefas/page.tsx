import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { TarefasTable } from "@/components/tables/TarefasTable";
import { SearchBar } from "@/components/SearchBar";
import { FilterSelect } from "@/components/FilterSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tarefas" };

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const where: Prisma.TarefaWhereInput = {};
  if (q) {
    where.descricao = { contains: q, mode: "insensitive" };
  }
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

  return (
    <div>
      <Breadcrumbs items={[{ label: "Tarefas" }]} />
      <Topbar
        title="Tarefas"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por descrição..." />
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

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <TarefasTable data={tarefas} />
      </div>
    </div>
  );
}
