"use client";

import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { FilterableDataTable, type Column } from "@/components/FilterableDataTable";
import RowActions from "@/components/RowActions";
import { Check, AlertTriangle } from "lucide-react";

interface ExigenciaData {
  id: number;
  descricao: string;
  cumprida: boolean;
  prazo: Date;
  processo: {
    id: number;
    numProtocolo: string;
    tipo: string;
    orgao: { sigla: string };
    empreendimento: { apelido: string };
  };
}

export function ExigenciasTable({ data }: { data: ExigenciaData[] }) {
  const columns: Column<ExigenciaData>[] = [
    { header: "Descrição", sortable: true, sortKey: "descricao", className: "max-w-xs truncate", render: (e) => <Link href={`/exigencias/${e.id}`} title={e.descricao} className="block max-w-[220px] truncate font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{e.descricao}</Link> },
    { header: "Processo", hideBelow: "md", render: (e) => <Link href={`/processos/${e.processo.id}`} className="font-mono text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline">{e.processo.numProtocolo}</Link> },
    { header: "Tipo", hideBelow: "lg", render: (e) => e.processo.tipo },
    { header: "Órgão", hideBelow: "lg", render: (e) => e.processo.orgao.sigla },
    { header: "Empreendimento", hideBelow: "lg", render: (e) => e.processo.empreendimento.apelido },
    {
      header: "Prazo",
      sortable: true, sortKey: "prazo",
      render: (e) => {
        const dias = differenceInDays(new Date(e.prazo), new Date());
        const cor = e.cumprida ? "text-[var(--color-ink-500)]" : dias < 0 ? "text-[var(--color-river-700)] font-medium" : dias <= 7 ? "text-[var(--color-river-700)] font-medium" : "text-[var(--color-ink-700)]";
        return (
          <div className={cor}>
            {format(new Date(e.prazo), "dd/MM/yyyy", { locale: ptBR })}
            {!e.cumprida && <span className="block text-xs">{dias < 0 ? `Vencido há ${Math.abs(dias)} dias` : `${dias} dias restantes`}</span>}
          </div>
        );
      },
    },
    {
      header: "Cumprida",
      headerClassName: "text-center",
      className: "text-center",
      render: (e) => (e.cumprida ? <Check size={18} className="text-[var(--color-brand-600)]" /> : <AlertTriangle size={18} className="text-[var(--color-river-700)]" />),
    },
    { header: "Ações", render: (e) => <RowActions detailUrl={`/exigencias/${e.id}`} editUrl={`/exigencias/${e.id}/editar`} entity="exigencia" entityName="Exigência" endpoint={`/api/exigencias/${e.id}`} /> },
  ];
  return (
    <FilterableDataTable
      data={data}
      columns={columns}
      endpoint="/api/exigencias"
      emptyMessage="Nenhuma exigência cadastrada"
      placeholder="Buscar por descrição, protocolo ou empreendimento..."
      searchFields={[
        (e) => e.descricao,
        (e) => e.processo.numProtocolo,
        (e) => e.processo.tipo,
        (e) => e.processo.orgao.sigla,
        (e) => e.processo.empreendimento.apelido,
      ]}
    />
  );
}
