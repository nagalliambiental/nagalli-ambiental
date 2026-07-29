"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import { Download } from "lucide-react";

interface DocData {
  id: number;
  nome: string;
  tipo: string;
  caminho: string;
  tamanho: number;
  criadoEm: Date;
  processo: { numProtocolo: string } | null;
}

const tipoColors: Record<string, string> = {
  licenca: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  parecer: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  oficio: "bg-[var(--color-paper-100)] text-[var(--color-ink-700)]",
  laudo: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  relatorio: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  contrato: "bg-[var(--color-paper-100)] text-[var(--color-ink-700)]",
  anexo: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  outro: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
}

export function DocumentosTable({ data, q }: { data: DocData[]; q?: string | null }) {
  const columns: Column<DocData>[] = [
    {
      header: "Nome",
      className: "max-w-xs truncate",
      render: (d) => (
        <Link href={`/documentos/${d.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">
          {d.nome}
        </Link>
      ),
    },
    {
      header: "Tipo",
      render: (d) => (
        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${tipoColors[d.tipo] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
          {d.tipo.charAt(0).toUpperCase() + d.tipo.slice(1)}
        </span>
      ),
    },
    { header: "Processo", render: (d) => <span className="font-mono text-sm">{d.processo?.numProtocolo || "—"}</span> },
    { header: "Tamanho", render: (d) => formatBytes(d.tamanho) },
    { header: "Data", render: (d) => format(new Date(d.criadoEm), "dd/MM/yyyy", { locale: ptBR }) },
    {
      header: "Ações",
      render: (d) => (
        <div className="flex items-center gap-2">
          <a href={d.caminho} download className="text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]" title="Download"><Download size={16} /></a>
          <RowActions detailUrl={`/documentos/${d.id}`} entity="documento" entityName="Documento" endpoint={`/api/documentos/${d.id}`} />
        </div>
      ),
    },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/documentos" searchQuery={q} emptyMessage="Nenhum documento cadastrado" />;
}
