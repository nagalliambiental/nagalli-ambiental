"use client";

import { useState, useRef, useEffect } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import { ChevronRight, ChevronDown, MapPin, FileText, ChevronDown as ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { TEMPLATES } from "@/lib/templates";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    { header: "Ações", render: (c) => <RowActions detailUrl={`/clientes/${c.id}`} editUrl={`/clientes/${c.id}/editar`} entity="cliente" entityName="Cliente" endpoint={`/api/clientes/${c.id}`} /> },
  ];

  return (
    <div>
      <DataTable
        data={data}
        columns={columns}
        endpoint="/api/clientes"
        searchQuery={q}
        emptyMessage="Nenhum cliente cadastrado"
        extraBulkActions={(selectedIds) => (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <FileText size={14} />
              Gerar Documentos
              <ChevronDownIcon size={12} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-[var(--color-paper-200)] bg-white py-1 shadow-lg">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      for (const id of selectedIds) {
                        window.open(`/clientes/${id}/gerar/${t.slug}`, "_blank");
                      }
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                  >
                    <FileText size={14} className="text-[var(--color-brand-500)]" />
                    <span>{t.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
