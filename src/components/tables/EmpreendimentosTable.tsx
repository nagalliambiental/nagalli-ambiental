"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
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

export function EmpreendimentosTable({ data, q }: { data: EmpData[]; q?: string | null }) {
  const columns: Column<EmpData>[] = [
    { header: "Apelido", sortable: true, sortKey: "apelido", render: (e) => <Link href={`/empreendimentos/${e.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{e.apelido}</Link> },
    { header: "Cliente", render: (e) => <Link href={`/clientes/${e.cliente.id}`} className="hover:text-[var(--color-brand-600)] hover:underline">{e.cliente.apelido}</Link> },
    {
      header: "Endereço",
      className: "max-w-xs truncate",
      render: (e) => [e.rua, e.numero, e.bairro].filter(Boolean).join(", ") || e.municipio || "-",
    },
    { header: "Processos", headerClassName: "text-center", className: "text-center", render: (e) => e._count.processos },
    { header: "Ações", render: (e) => <RowActions detailUrl={`/empreendimentos/${e.id}`} editUrl={`/empreendimentos/${e.id}/editar`} entity="empreendimento" entityName="Empreendimento" endpoint={`/api/empreendimentos/${e.id}`} /> },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/empreendimentos" searchQuery={q} emptyMessage="Nenhum empreendimento cadastrado" />;
}
