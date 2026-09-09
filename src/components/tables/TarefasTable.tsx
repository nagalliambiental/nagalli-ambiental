"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { FilterableDataTable, type Column } from "@/components/FilterableDataTable";
import RowActions from "@/components/RowActions";

interface TarefaData {
  id: number;
  titulo: string;
  descricao?: string | null;
  prioridade: string;
  status: string;
  prazoFinal: Date | null;
  responsavel: { nome: string };
  usuario: { nome: string };
  empreendimento?: { apelido: string } | null;
}

const statusLabels: Record<string, string> = { pendente: "Pendente", iniciada: "Iniciada", concluida: "Concluída" };
const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  iniciada: "bg-blue-50 text-blue-600",
  concluida: "bg-green-50 text-green-700",
};
const prioridadeLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
const prioridadeColors: Record<string, string> = {
  baixa: "text-[var(--color-ink-500)]", media: "text-[var(--color-brand-600)]",
  alta: "text-[var(--color-river-700)] font-medium", urgente: "text-[var(--color-river-700)] font-medium",
};

export function TarefasTable({ data }: { data: TarefaData[] }) {
  const columns: Column<TarefaData>[] = [
    { header: "Título", sortable: true, sortKey: "titulo", className: "max-w-xs truncate", render: (t) => <Link href={`/tarefas/${t.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline"><span className="block max-w-[220px] truncate" title={t.titulo}>{t.titulo}</span></Link> },
    {
      header: "Prioridade",
      sortable: true, sortKey: "prioridade",
      render: (t) => <span className={`text-sm font-medium ${prioridadeColors[t.prioridade] || "text-[var(--color-ink-700)]"}`}>{prioridadeLabels[t.prioridade] || t.prioridade}</span>,
    },
    { header: "Responsável", hideBelow: "md", render: (t) => t.responsavel.nome },
    { header: "Empreendimento", hideBelow: "lg", render: (t) => t.empreendimento?.apelido ?? "—" },
    { header: "Criador", hideBelow: "lg", render: (t) => t.usuario.nome },
    {
      header: "Status",
      sortable: true, sortKey: "status",
      render: (t) => <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[t.status] || ""}`}>{statusLabels[t.status] || t.status}</span>,
    },
    {
      header: "Prazo",
      hideBelow: "md",
      render: (t) => (t.prazoFinal ? format(new Date(t.prazoFinal), "dd/MM/yyyy", { locale: ptBR }) : "—"),
    },
    { header: "Ações", render: (t) => <RowActions detailUrl={`/tarefas/${t.id}`} editUrl={`/tarefas/${t.id}/editar`} entity="tarefa" entityName="Tarefa" endpoint={`/api/tarefas/${t.id}`} /> },
  ];
  return (
    <FilterableDataTable
      data={data}
      columns={columns}
      endpoint="/api/tarefas"
      emptyMessage="Nenhuma tarefa cadastrada"
      placeholder="Buscar por título, descrição ou responsável..."
      searchFields={[(t) => t.titulo, (t) => t.descricao || "", (t) => t.responsavel.nome, (t) => t.usuario.nome]}
    />
  );
}
