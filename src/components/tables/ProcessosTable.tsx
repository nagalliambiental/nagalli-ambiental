"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { FilterableDataTable, type Column } from "@/components/FilterableDataTable";
import RowActions from "@/components/RowActions";

interface ProcessoData {
  id: number;
  numProtocolo: string;
  tipo: string;
  status: string;
  validade: Date | null;
  orgao: { sigla: string };
  empreendimento: { id: number; apelido: string };
}

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado", em_andamento: "Em Andamento", exigencia_recebida: "Exigência Recebida",
  deferido: "Deferido", indeferido: "Indeferido", arquivado: "Arquivado", vencido: "Vencido",
};
const statusColors: Record<string, string> = {
  protocolado: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  em_andamento: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  deferido: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  indeferido: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  arquivado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  vencido: "bg-red-50 text-red-700",
};

export function ProcessosTable({ data }: { data: ProcessoData[] }) {
  const columns: Column<ProcessoData>[] = [
    { header: "Protocolo", sortable: true, sortKey: "numProtocolo", render: (p) => <Link href={`/processos/${p.id}`} className="font-mono text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline"><span className="block max-w-[220px] truncate" title={p.numProtocolo}>{p.numProtocolo}</span></Link> },
    { header: "Tipo", sortable: true, sortKey: "tipo", hideBelow: "lg", render: (p) => <span className="block max-w-[220px] truncate" title={p.tipo}>{p.tipo}</span> },
    { header: "Órgão", hideBelow: "md", render: (p) => <span className="font-medium text-[var(--color-ink-900)]">{p.orgao.sigla}</span> },
    { header: "Empreendimento", hideBelow: "lg", render: (p) => <Link href={`/empreendimentos/${p.empreendimento.id}`} className="hover:text-[var(--color-brand-600)] hover:underline"><span className="block max-w-[220px] truncate" title={p.empreendimento.apelido}>{p.empreendimento.apelido}</span></Link> },
    {
      header: "Status",
      sortable: true, sortKey: "status",
      render: (p) => (
        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[p.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
          {statusLabels[p.status] || p.status}
        </span>
      ),
    },
    {
      header: "Validade",
      hideBelow: "md",
      render: (p) => (p.validade ? format(new Date(p.validade), "dd/MM/yyyy", { locale: ptBR }) : "—"),
    },
    { header: "Ações", render: (p) => <RowActions detailUrl={`/processos/${p.id}`} editUrl={`/processos/${p.id}/editar`} entity="processo" entityName="Processo" endpoint={`/api/processos/${p.id}`} /> },
  ];
  return (
    <FilterableDataTable
      data={data}
      columns={columns}
      endpoint="/api/processos"
      emptyMessage="Nenhum processo cadastrado"
      placeholder="Buscar por protocolo, tipo ou empreendimento..."
      searchFields={[(p) => p.numProtocolo, (p) => p.tipo, (p) => p.orgao.sigla, (p) => p.empreendimento.apelido]}
    />
  );
}
