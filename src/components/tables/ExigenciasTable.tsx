"use client";

import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataTable, type Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import { Check, AlertTriangle } from "lucide-react";

interface ExigenciaData {
  id: number;
  descricao: string;
  cumprida: boolean;
  prazo: Date;
  processo: {
    numProtocolo: string;
    orgao: { sigla: string };
    empreendimento: { apelido: string };
  };
}

export function ExigenciasTable({ data }: { data: ExigenciaData[] }) {
  const columns: Column<ExigenciaData>[] = [
    { header: "Descrição", sortable: true, sortKey: "descricao", className: "max-w-xs truncate", render: (e) => <span className="font-medium text-[var(--color-ink-900)]">{e.descricao}</span> },
    { header: "Processo", render: (e) => <span className="font-mono text-sm">{e.processo.numProtocolo}</span> },
    { header: "Órgão", render: (e) => e.processo.orgao.sigla },
    { header: "Empreendimento", render: (e) => e.processo.empreendimento.apelido },
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
    { header: "Ações", render: (e) => <RowActions detailUrl={`/exigencias/${e.id}`} entity="exigencia" entityName="Exigência" endpoint={`/api/exigencias/${e.id}`} /> },
  ];
  return <DataTable data={data} columns={columns} endpoint="/api/exigencias" emptyMessage="Nenhuma exigência cadastrada" />;
}
