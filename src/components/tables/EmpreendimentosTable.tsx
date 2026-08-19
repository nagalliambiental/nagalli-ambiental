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
    { header: "Apelido", sortable: true, sortKey: "apelido", render: (e) => <Link href={`/empreendimentos/${e.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{e.apelido}</Link> },
    { header: "Cliente", render: (e) => <Link href={`/clientes/${e.cliente.id}`} className="hover:text-[var(--color-brand-600)] hover:underline">{e.cliente.apelido}</Link> },
    {
      header: "Endereço",
      className: "max-w-xs truncate",
      render: (e) => [e.rua, e.numero && e.numero !== "0" && e.numero !== "S/N" ? e.numero : null, e.bairro].filter(Boolean).join(", ") || e.municipio || "-",
    },
    { header: "Processos", headerClassName: "text-center", className: "text-center", render: (e) => e._count.processos },
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
