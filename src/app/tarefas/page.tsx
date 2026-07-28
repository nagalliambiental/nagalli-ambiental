import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Eye, ClipboardList } from "lucide-react";
import RowActions from "@/components/RowActions";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  em_andamento: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  concluida: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  cancelada: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const prioridadeColors: Record<string, string> = {
  baixa: "text-[var(--color-ink-500)]",
  media: "text-[var(--color-brand-600)]",
  alta: "text-[var(--color-river-700)] font-medium",
  urgente: "text-[var(--color-river-700)] font-medium",
};

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
        {tarefas.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Título</th>
                <th className="text-left p-4 font-medium">Prioridade</th>
                <th className="text-left p-4 font-medium">Responsável</th>
                <th className="text-left p-4 font-medium">Criador</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Vencimento</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((t) => (
                <tr key={t.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-medium max-w-xs truncate text-[var(--color-ink-900)]">{t.titulo}</td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${prioridadeColors[t.prioridade] || "text-[var(--color-ink-700)]"}`}>
                      {prioridadeLabels[t.prioridade] || t.prioridade}
                    </span>
                  </td>
                  <td className="p-4">{t.responsavel.nome}</td>
                  <td className="p-4">{t.usuario.nome}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[t.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {t.dataVencimento
                      ? format(t.dataVencimento, "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </td>
                  <td className="p-4">
                    <RowActions detailUrl={`/tarefas/${t.id}`} entity="tarefa" entityName="Tarefa" endpoint={`/api/tarefas/${t.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <ClipboardList size={24} />
            </div>
            <p className="text-sm">Nenhuma tarefa cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
