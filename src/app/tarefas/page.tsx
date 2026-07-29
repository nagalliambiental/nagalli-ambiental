import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { TarefasTable } from "@/components/tables/TarefasTable";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const tarefas = await prisma.tarefa.findMany({
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
      <Topbar
        title="Tarefas"
        actions={
          <Link
            href="/tarefas/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Nova Tarefa
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <TarefasTable data={tarefas} />
      </div>
    </div>
  );
}
