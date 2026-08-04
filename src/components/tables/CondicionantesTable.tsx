"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";

interface CondicionanteData {
  id: number;
  descricao: string;
  status: string;
  prazo: Date | null;
  responsavel: string | null;
  processo: { numProtocolo: string; empreendimento: { apelido: string }; orgao: { sigla: string } };
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  cumprida: "Cumprida",
  vencida: "Vencida",
  suspensa: "Suspensa",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-800",
  em_andamento: "bg-blue-50 text-blue-800",
  cumprida: "bg-green-50 text-green-800",
  vencida: "bg-red-50 text-red-800",
  suspensa: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export function CondicionantesTable({ data, q }: { data: CondicionanteData[]; q?: string | null }) {
  const columns: Column<CondicionanteData>[] = [
    {
      header: "Descrição",
      sortable: true,
      sortKey: "descricao",
      render: (c) => (
        <Link href={`/condicionantes/${c.id}`} className="text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline">
          {c.descricao.length > 60 ? c.descricao.slice(0, 60) + "..." : c.descricao}
        </Link>
      ),
    },
    {
      header: "Processo",
      render: (c) => (
        <span className="text-sm text-[var(--color-ink-700)]">
          {c.processo.numProtocolo}
        </span>
      ),
    },
    {
      header: "Empreendimento",
      render: (c) => (
        <span className="text-sm text-[var(--color-ink-700)]">
          {c.processo.empreendimento.apelido}
        </span>
      ),
    },
    {
      header: "Status",
      sortable: true,
      sortKey: "status",
      render: (c) => (
        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[c.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
          {statusLabels[c.status] || c.status}
        </span>
      ),
    },
    {
      header: "Prazo",
      sortable: true,
      sortKey: "prazo",
      render: (c) => c.prazo ? format(new Date(c.prazo), "dd/MM/yyyy", { locale: ptBR }) : "—",
    },
    {
      header: "Responsável",
      render: (c) => c.responsavel || "—",
    },
    {
      header: "Ações",
      render: (c) => <RowActions detailUrl={`/condicionantes/${c.id}`} editUrl={`/condicionantes/${c.id}/editar`} entity="condicionante" entityName="Condicionante" endpoint={`/api/condicionantes/${c.id}`} />,
    },
  ];

  return <DataTable data={data} columns={columns} endpoint="/api/condicionantes" searchQuery={q} emptyMessage="Nenhuma condicionante cadastrada" />;
}
