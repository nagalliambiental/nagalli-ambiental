"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { FilterableDataTable, type Column } from "@/components/FilterableDataTable";
import RowActions from "@/components/RowActions";

interface ContratoData {
  id: number;
  servicoProcesso: string;
  dataAssinatura: Date;
  dataValidade: Date;
  alertaRenovacaoDias: number;
  ativo: boolean;
  cliente: { id: number; apelido: string };
  empreendimento: { id: number; apelido: string } | null;
}

function getSituacao(r: ContratoData) {
  const hoje = new Date();
  const validade = new Date(r.dataValidade);
  const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (diffDias <= r.alertaRenovacaoDias) return { label: `Vence em ${diffDias}d`, cls: "bg-[var(--color-river-100)] text-[var(--color-river-700)]" };
  return { label: "Vigente", cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" };
}

export function ContratoTable({ data }: { data: ContratoData[] }) {
  const columns: Column<ContratoData>[] = [
    { header: "Cliente", sortable: true, sortKey: "clienteId", render: (r) => <Link href={`/clientes/${r.cliente.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{r.cliente.apelido}</Link> },
    {
      header: "Empreendimento",
      render: (r) => (r.empreendimento ? <Link href={`/empreendimentos/${r.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">{r.empreendimento.apelido}</Link> : "—"),
    },
    { header: "Serviço / Processo", render: (r) => <span className="line-clamp-1 max-w-[260px]">{r.servicoProcesso}</span> },
    { header: "Assinatura", sortable: true, sortKey: "dataAssinatura", render: (r) => format(new Date(r.dataAssinatura), "dd/MM/yyyy", { locale: ptBR }) },
    { header: "Validade", sortable: true, sortKey: "dataValidade", render: (r) => format(new Date(r.dataValidade), "dd/MM/yyyy", { locale: ptBR }) },
    {
      header: "Situação",
      render: (r) => {
        const s = getSituacao(r);
        return <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
      },
    },
    { header: "Ações", render: (r) => <RowActions detailUrl={`/contratos/${r.id}`} editUrl={`/contratos/${r.id}/editar`} entity="contrato" entityName="Contrato" endpoint={`/api/contratos/${r.id}`} /> },
  ];
  return (
    <FilterableDataTable
      data={data}
      columns={columns}
      endpoint="/api/contratos"
      emptyMessage="Nenhum contrato cadastrado"
      placeholder="Buscar por cliente, serviço ou empreendimento..."
      searchFields={[(r) => r.cliente.apelido, (r) => r.servicoProcesso, (r) => r.empreendimento?.apelido || ""]}
    />
  );
}
