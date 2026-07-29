import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, FileText } from "lucide-react";
import RowActions from "@/components/RowActions";
import { SearchBar } from "@/components/SearchBar";
import { FilterSelect } from "@/components/FilterSelect";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado",
  em_andamento: "Em Andamento",
  exigencia_recebida: "Exigência Recebida",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado",
};

const statusColors: Record<string, string> = {
  protocolado: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  em_andamento: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  exigencia_recebida: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  deferido: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  indeferido: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  arquivado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const where: Prisma.ProcessoWhereInput = {};
  if (q) {
    where.OR = [
      { numProtocolo: { contains: q, mode: "insensitive" } },
      { tipo: { contains: q, mode: "insensitive" } },
      { empreendimento: { apelido: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (status) {
    where.status = status;
  }

  const processos = await prisma.processo.findMany({
    where,
    include: {
      orgao: { select: { sigla: true } },
      empreendimento: { select: { apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <Topbar
        title="Processos"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por protocolo, tipo ou empreendimento..." />
            <FilterSelect
              paramName="status"
              options={[
                { value: "", label: "Todos os status" },
                { value: "protocolado", label: "Protocolado" },
                { value: "em_andamento", label: "Em Andamento" },
                { value: "exigencia_recebida", label: "Exigência Recebida" },
                { value: "deferido", label: "Deferido" },
                { value: "indeferido", label: "Indeferido" },
                { value: "arquivado", label: "Arquivado" },
              ]}
            />
            <Link
              href="/processos/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo Processo
            </Link>
          </div>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {processos.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Protocolo</th>
                <th className="text-left p-4 font-medium">Tipo</th>
                <th className="text-left p-4 font-medium">Órgão</th>
                <th className="text-left p-4 font-medium">Empreendimento</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Validade</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-mono text-sm">{p.numProtocolo}</td>
                  <td className="p-4">{p.tipo}</td>
                  <td className="p-4 font-medium text-[var(--color-ink-900)]">{p.orgao.sigla}</td>
                  <td className="p-4">{p.empreendimento.apelido}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusColors[p.status] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.validade ? format(p.validade, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </td>
                  <td className="p-4">
                    <RowActions detailUrl={`/processos/${p.id}`} entity="processo" entityName="Processo" endpoint={`/api/processos/${p.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <FileText size={24} />
            </div>
            <p className="text-sm">{q || status ? "Nenhum processo encontrado para essa busca" : "Nenhum processo cadastrado"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
