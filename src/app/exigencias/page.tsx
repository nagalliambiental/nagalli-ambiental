import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Eye, Check, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExigenciasPage() {
  const exigencias = await prisma.exigencia.findMany({
    include: {
      processo: {
        select: {
          numProtocolo: true,
          orgao: { select: { sigla: true } },
          empreendimento: { select: { apelido: true } },
        },
      },
    },
    orderBy: [{ cumprida: "asc" }, { prazo: "asc" }],
  });

  return (
    <div>
      <Topbar
        title="Exigências"
        actions={
          <Link
            href="/exigencias/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Nova Exigência
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {exigencias.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Descrição</th>
                <th className="text-left p-4 font-medium">Processo</th>
                <th className="text-left p-4 font-medium">Órgão</th>
                <th className="text-left p-4 font-medium">Empreendimento</th>
                <th className="text-left p-4 font-medium">Prazo</th>
                <th className="text-center p-4 font-medium">Cumprida</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {exigencias.map((e) => {
                const diasRestantes = differenceInDays(e.prazo, new Date());
                const prazoColor = e.cumprida
                  ? "text-[var(--color-ink-500)]"
                  : diasRestantes < 0
                    ? "text-[var(--color-river-700)] font-medium"
                    : diasRestantes <= 7
                      ? "text-[var(--color-river-700)] font-medium"
                      : "text-[var(--color-ink-700)]";
                return (
                  <tr key={e.id} className={`border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] ${!e.cumprida && diasRestantes < 0 ? "bg-[var(--color-river-100)]" : ""}`}>
                    <td className="p-4 max-w-xs truncate text-[var(--color-ink-900)]">{e.descricao}</td>
                    <td className="p-4 font-mono text-sm">{e.processo.numProtocolo}</td>
                    <td className="p-4">{e.processo.orgao.sigla}</td>
                    <td className="p-4">{e.processo.empreendimento.apelido}</td>
                    <td className={`p-4 ${prazoColor}`}>
                      {format(e.prazo, "dd/MM/yyyy", { locale: ptBR })}
                      {!e.cumprida && (
                        <span className="block text-xs">
                          {diasRestantes < 0
                            ? `Vencido há ${Math.abs(diasRestantes)} dias`
                            : `${diasRestantes} dias restantes`}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {e.cumprida ? (
                        <Check size={18} className="text-[var(--color-brand-600)]" />
                      ) : (
                        <AlertTriangle size={18} className="text-[var(--color-river-700)]" />
                      )}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/exigencias/${e.id}`}
                        className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                      >
                        <Eye size={14} />
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <Inbox size={24} />
            </div>
            <p className="text-sm">Nenhuma exigência cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
