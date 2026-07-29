"use client";

import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";

interface EmpData {
  id: number;
  apelido: string;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  cliente: { apelido: string };
  _count: { processos: number };
}

export function EmpreendimentosTable({ data, q }: { data: EmpData[]; q?: string | null }) {
  const columns: Column<EmpData>[] = [
    { header: "Apelido", render: (e) => <span className="font-medium text-[var(--color-ink-900)]">{e.apelido}</span> },
    { header: "Cliente", render: (e) => e.cliente.apelido },
    {
      header: "Endereço",
      className: "max-w-xs truncate",
      render: (e) => [e.rua, e.numero, e.bairro].filter(Boolean).join(", ") || e.municipio || "-",
    },
    { header: "Processos", headerClassName: "text-center", className: "text-center", render: (e) => e._count.processos },
    { header: "Ações", render: (e) => <RowActions detailUrl={`/empreendimentos/${e.id}`} entity="empreendimento" entityName="Empreendimento" endpoint={`/api/empreendimentos/${e.id}`} /> },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/empreendimentos" searchQuery={q} emptyMessage="Nenhum empreendimento cadastrado" />;
}
