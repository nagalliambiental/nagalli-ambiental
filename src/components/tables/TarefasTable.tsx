"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";

interface TarefaData {
  id: number;
  titulo: string;
  prioridade: string;
  status: string;
  dataVencimento: Date | null;
  responsavel: { nome: string };
  usuario: { nome: string };
}

const statusLabels: Record<string, string> = { pendente: "Pendente", em_andamento: "Em Andamento", concluida: "Concluída", cancelada: "Cancelada" };
const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  em_andamento: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  concluida: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  cancelada: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};
const prioridadeLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
const prioridadeColors: Record<string, string> = {
  baixa: "text-[var(--color-ink-500)]", media: "text-[var(--color-brand-600)]",
  alta: "text-[var(--color-river-700)] font-medium", urgente: "text-[var(--color-river-700)] font-medium",
};

export function TarefasTable({ data }: { data: TarefaData[] }) {
  const columns: Column<TarefaData>[] = [
    { header: "Título", sortable: true, sortKey: "titulo", className: "max-w-xs truncate", render: (t) => <span className="font-medium text-[var(--color-ink-900)]">{t.titulo}</span> },
    {
      header: "Prioridade",
      sortable: true, sortKey: "prioridade",
      render: (t) => <span className={`text-sm font-medium ${prioridadeColors[t.prioridade] || "text-[var(--color-ink-700)]"}`}>{prioridadeLabels[t.prioridade] || t.prioridade}</span>,
    },
    { header: "Responsável", render: (t) => t.responsavel.nome },
    { header: "Criador", render: (t) => t.usuario.nome },
    {
      header: "Status",
      sortable: true, sortKey: "status",
      render: (t) => <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[t.status] || ""}`}>{statusLabels[t.status] || t.status}</span>,
    },
    {
      header: "Vencimento",
      render: (t) => (t.dataVencimento ? format(new Date(t.dataVencimento), "dd/MM/yyyy", { locale: ptBR }) : "—"),
    },
    { header: "Ações", render: (t) => <RowActions detailUrl={`/tarefas/${t.id}`} entity="tarefa" entityName="Tarefa" endpoint={`/api/tarefas/${t.id}`} /> },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/tarefas" emptyMessage="Nenhuma tarefa cadastrada" />;
}
