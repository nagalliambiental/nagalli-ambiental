"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";

interface PropostaData {
  id: number;
  titulo: string;
  valor: number | null;
  status: string;
  criadoEm: Date;
  cliente: { apelido: string };
  empreendimento: { apelido: string } | null;
}

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

const statusColors: Record<string, string> = {
  rascunho: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  enviada: "bg-blue-50 text-blue-800",
  aprovada: "bg-green-50 text-green-800",
  rejeitada: "bg-red-50 text-red-800",
};

export function PropostasTable({ data, q }: { data: PropostaData[]; q?: string | null }) {
  const columns: Column<PropostaData>[] = [
    {
      header: "Título",
      sortable: true,
      sortKey: "titulo",
      render: (p) => (
        <Link href={`/propostas/${p.id}`} className="text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline">
          {p.titulo}
        </Link>
      ),
    },
    {
      header: "Cliente",
      sortable: true,
      sortKey: "cliente",
      render: (p) => <span className="text-sm text-[var(--color-ink-700)]">{p.cliente.apelido}</span>,
    },
    {
      header: "Empreendimento",
      render: (p) => <span className="text-sm text-[var(--color-ink-700)]">{p.empreendimento?.apelido || "—"}</span>,
    },
    {
      header: "Valor",
      sortable: true,
      sortKey: "valor",
      render: (p) => p.valor != null ? <span className="text-sm font-medium text-[var(--color-ink-900)]">R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span> : "—",
    },
    {
      header: "Status",
      sortable: true,
      sortKey: "status",
      render: (p) => (
        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[p.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
          {statusLabels[p.status] || p.status}
        </span>
      ),
    },
    {
      header: "Criado em",
      sortable: true,
      sortKey: "criadoEm",
      render: (p) => format(new Date(p.criadoEm), "dd/MM/yyyy", { locale: ptBR }),
    },
    {
      header: "Ações",
      render: (p) => <RowActions detailUrl={`/propostas/${p.id}`} editUrl={`/propostas/${p.id}/editar`} entity="proposta" entityName="Proposta" endpoint={`/api/propostas/${p.id}`} />,
    },
  ];

  return <DataTable data={data} columns={columns} endpoint="/api/propostas" searchQuery={q} emptyMessage="Nenhuma proposta cadastrada" />;
}
