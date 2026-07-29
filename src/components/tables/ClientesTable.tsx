"use client";

import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";

interface ClienteData {
  id: number;
  apelido: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  _count: { empreendimentos: number };
}

export function ClientesTable({ data, q }: { data: ClienteData[]; q?: string | null }) {
  const columns: Column<ClienteData>[] = [
    { header: "Apelido", render: (c) => <span className="font-medium text-[var(--color-ink-900)]">{c.apelido}</span> },
    { header: "Razão Social", render: (c) => c.razaoSocial },
    { header: "CNPJ", render: (c) => c.cnpj },
    { header: "Telefone", render: (c) => c.telefone },
    { header: "Empreendimentos", headerClassName: "text-center", className: "text-center", render: (c) => c._count.empreendimentos },
    { header: "Ações", render: (c) => <RowActions detailUrl={`/clientes/${c.id}`} entity="cliente" entityName="Cliente" endpoint={`/api/clientes/${c.id}`} /> },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/clientes" searchQuery={q} emptyMessage="Nenhum cliente cadastrado" />;
}
