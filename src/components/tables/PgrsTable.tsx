"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { FilterableDataTable, type Column } from "@/components/FilterableDataTable";
import RowActions from "@/components/RowActions";

interface PgrsData {
  id: number;
  numero: string | null;
  orgao: string | null;
  validade: Date | null;
  alertaDias: number;
  empreendimento: { id: number; apelido: string; cliente?: { id: number; apelido: string } | null };
}

function getSituacao(r: PgrsData) {
  if (!r.validade) return { label: "Sem validade", cls: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]" };
  const hoje = new Date();
  const validade = new Date(r.validade);
  const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (diffDias <= r.alertaDias) return { label: `Vence em ${diffDias}d`, cls: "bg-amber-100 text-amber-800" };
  return { label: "Vigente", cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" };
}

export function PgrsTable({ data }: { data: PgrsData[] }) {
  const columns: Column<PgrsData>[] = [
    {
      header: "Empreendimento",
      sortable: true,
      sortKey: "numero",
      render: (r) => (
        <Link href={`/pgrs/${r.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">
          {r.empreendimento.apelido}
        </Link>
      ),
    },
    {
      header: "Cliente",
      hideBelow: "md",
      render: (r) =>
        r.empreendimento.cliente ? (
          <Link href={`/clientes/${r.empreendimento.cliente.id}`} className="text-[var(--color-brand-600)] hover:underline">
            {r.empreendimento.cliente.apelido}
          </Link>
        ) : (
          "—"
        ),
    },
    { header: "Nº Deferimento", hideBelow: "lg", render: (r) => r.numero || "—" },
    { header: "Órgão", hideBelow: "xl", render: (r) => r.orgao || "—" },
    {
      header: "Validade",
      sortable: true,
      sortKey: "validade",
      render: (r) => (r.validade ? format(new Date(r.validade), "dd/MM/yyyy", { locale: ptBR }) : "—"),
    },
    {
      header: "Situação",
      render: (r) => {
        const s = getSituacao(r);
        return <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
      },
    },
    {
      header: "Ações",
      render: (r) => (
        <RowActions detailUrl={`/pgrs/${r.id}`} editUrl={`/pgrs/${r.id}/editar`} entity="pgrs" entityName="PGRS" endpoint={`/api/pgrs/${r.id}`} />
      ),
    },
  ];

  return (
    <FilterableDataTable
      data={data}
      columns={columns}
      endpoint="/api/pgrs"
      emptyMessage="Nenhum PGRS cadastrado"
      placeholder="Buscar por empreendimento, cliente, número ou órgão..."
      searchFields={[
        (r) => r.empreendimento.apelido,
        (r) => r.empreendimento.cliente?.apelido || "",
        (r) => r.numero || "",
        (r) => r.orgao || "",
      ]}
    />
  );
}
