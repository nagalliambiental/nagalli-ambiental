"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import { ChevronRight, ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";

interface ClienteData {
  id: number;
  apelido: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  _count: { empreendimentos: number };
  empreendimentos: { id: number; apelido: string }[];
}

export function ClientesTable({ data, q }: { data: ClienteData[]; q?: string | null }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const columns: Column<ClienteData>[] = [
    {
      header: "Apelido",
      sortable: true, sortKey: "apelido",
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
            className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]"
          >
            {expandedId === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Link href={`/clientes/${c.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{c.apelido}</Link>
        </div>
      ),
    },
    { header: "Razão Social", sortable: true, sortKey: "razaoSocial", render: (c) => c.razaoSocial },
    { header: "CNPJ", sortable: true, sortKey: "cnpj", render: (c) => c.cnpj },
    { header: "Telefone", render: (c) => c.telefone },
    { header: "Empreendimentos", headerClassName: "text-center", className: "text-center", render: (c) => c._count.empreendimentos },
    { header: "Ações", render: (c) => <RowActions detailUrl={`/clientes/${c.id}`} entity="cliente" entityName="Cliente" endpoint={`/api/clientes/${c.id}`} /> },
  ];

  return (
    <div>
      <DataTable
        data={data}
        columns={columns}
        endpoint="/api/clientes"
        searchQuery={q}
        emptyMessage="Nenhum cliente cadastrado"
        extraRow={(item) =>
          expandedId === item.id && item.empreendimentos.length > 0 ? (
            <tr key={`exp-${item.id}`} className="bg-[var(--color-paper-50)]">
              <td colSpan={columns.length + 1} className="px-4 py-3">
                <div className="ml-6 space-y-1">
                  {item.empreendimentos.map((emp) => (
                    <Link
                      key={emp.id}
                      href={`/empreendimentos/${emp.id}`}
                      className="flex items-center gap-2 text-sm text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]"
                    >
                      <MapPin size={12} />
                      {emp.apelido}
                    </Link>
                  ))}
                </div>
              </td>
            </tr>
          ) : null
        }
      />
    </div>
  );
}
