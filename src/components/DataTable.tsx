"use client";

import { useState } from "react";
import { Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export interface Column<T extends { id: number }> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T extends { id: number }> {
  data: T[];
  columns: Column<T>[];
  endpoint: string;
  emptyMessage?: string;
  searchQuery?: string | null;
  extraBulkActions?: React.ReactNode;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  endpoint,
  emptyMessage = "Nenhum registro encontrado",
  searchQuery,
  extraBulkActions,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(data.map((r) => r.id)));
  };

  const bulkAction = async (method: string, body?: object) => {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(
        `${endpoint}?ids=${ids.join(",")}`,
        { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }
      );
      if (!res.ok) throw new Error("Erro na operação em lote");
      setSelectedIds(new Set());
      window.location.reload();
    } catch {
      alert("Erro ao executar operação em lote.");
    }
  };

  const hasAtivo = data.length > 0 && "ativo" in data[0];

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-4 py-2">
          <span className="text-sm text-[var(--color-ink-500)]">{selectedIds.size} selecionado(s)</span>
          <div className="flex items-center gap-2">
            {extraBulkActions}
            {hasAtivo && (
              <>
                <button
                  type="button"
                  onClick={() => bulkAction("PATCH", { ativo: true })}
                  className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
                >
                  <ToggleRight size={14} />
                  Ativar
                </button>
                <button
                  type="button"
                  onClick={() => bulkAction("PATCH", { ativo: false })}
                  className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-river-600)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-river-700)]"
                >
                  <ToggleLeft size={14} />
                  Inativar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remover ${selectedIds.size} registro(s)?`)) bulkAction("DELETE");
              }}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 size={14} />
              Remover
            </button>
          </div>
        </div>
      )}
      {data.length > 0 ? (
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-[3%]" />
            {columns.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
              <th className="p-4 text-center">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds.size === data.length}
                  onChange={toggleSelectAll}
                  className="accent-[var(--color-brand-500)]"
                />
              </th>
              {columns.map((col, i) => (
                <th key={i} className={`text-left p-4 font-medium ${col.headerClassName || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                <td className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="accent-[var(--color-brand-500)]"
                  />
                </td>
                {columns.map((col, i) => (
                  <td key={i} className={`p-4 ${col.className || ""}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
          <p className="text-sm">{searchQuery ? "Nenhum registro encontrado para essa busca" : emptyMessage}</p>
        </div>
      )}
    </>
  );
}
