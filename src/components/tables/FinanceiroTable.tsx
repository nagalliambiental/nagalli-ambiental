"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";

interface FinanceiroData {
  id: number;
  tipoCobranca: string;
  valor: number;
  formaPagamento: string | null;
  statusPagamento: string;
  dataVencimento: Date | null;
  cliente: { id: number; apelido: string };
}

const statusLabels: Record<string, string> = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado", cancelado: "Cancelado" };
const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  pago: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  atrasado: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  cancelado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export function FinanceiroTable({ data }: { data: FinanceiroData[] }) {
  const columns: Column<FinanceiroData>[] = [
    { header: "Cliente", render: (r) => <Link href={`/clientes/${r.cliente.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{r.cliente.apelido}</Link> },
    { header: "Tipo", sortable: true, sortKey: "tipoCobranca", render: (r) => r.tipoCobranca },
    { header: "Valor", sortable: true, sortKey: "valor", headerClassName: "text-right", className: "text-right font-medium", render: (r) => r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
    { header: "Pagamento", render: (r) => r.formaPagamento || "—" },
    {
      header: "Status",
      sortable: true, sortKey: "statusPagamento",
      render: (r) => <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[r.statusPagamento] || ""}`}>{statusLabels[r.statusPagamento] || r.statusPagamento}</span>,
    },
    {
      header: "Vencimento",
      render: (r) => (r.dataVencimento ? format(new Date(r.dataVencimento), "dd/MM/yyyy", { locale: ptBR }) : "—"),
    },
    { header: "Ações", render: (r) => <RowActions detailUrl={`/financeiro/${r.id}`} entity="financeiro" entityName="Registro Financeiro" endpoint={`/api/financeiro/${r.id}`} /> },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/financeiro" emptyMessage="Nenhum registro financeiro cadastrado" />;
}
