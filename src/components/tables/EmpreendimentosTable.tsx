"use client";

import Link from "next/link";
import { FilterableDataTable, type Column } from "@/components/FilterableDataTable";
import RowActions from "@/components/RowActions";

interface EmpData {
  id: number;
  apelido: string;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  cliente: { id: number; apelido: string };
  _count: { processos: number };
}

export function EmpreendimentosTable({ data }: { data: EmpData[] }) {
  const columns: Column<EmpData>[] = [
    { header: "Apelido", sortable: true, sortKey: "apelido", render: (e) => <Link href={`/empreendimentos/${e.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline"><span className="block max-w-[220px] truncate" title={e.apelido}>{e.apelido}</span></Link> },
    { header: "Cliente", hideBelow: "md", render: (e) => <Link href={`/clientes/${e.cliente.id}`} className="hover:text-[var(--color-brand-600)] hover:underline"><span className="block max-w-[220px] truncate" title={e.cliente.apelido}>{e.cliente.apelido}</span></Link> },
    {
      header: "Endereço",
      className: "max-w-xs truncate",
      hideBelow: "lg",
      render: (e) => {
        const endereco = [e.rua, e.numero && e.numero !== "0" && e.numero !== "S/N" ? e.numero : null, e.bairro].filter(Boolean).join(", ") || e.municipio || "-";
        return <span className="block max-w-[220px] truncate" title={endereco}>{endereco}</span>;
      },
    },
    { header: "Licenças", headerClassName: "text-center", className: "text-center", hideBelow: "xl", render: (e) => e._count.processos },
    { header: "Ações", render: (e) => <RowActions detailUrl={`/empreendimentos/${e.id}`} editUrl={`/empreendimentos/${e.id}/editar`} entity="empreendimento" entityName="Empreendimento" endpoint={`/api/empreendimentos/${e.id}`} /> },
  ];
  return (
    <FilterableDataTable
      data={data}
      columns={columns}
      endpoint="/api/empreendimentos"
      emptyMessage="Nenhum empreendimento cadastrado"
      placeholder="Buscar por nome, cliente ou descrição..."
      searchFields={[
        (e) => e.apelido,
        (e) => e.cliente.apelido,
        (e) => [e.rua, e.numero, e.bairro, e.municipio].filter(Boolean).join(" "),
      ]}
    />
  );
}
