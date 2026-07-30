import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Plus } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterSelect } from "@/components/FilterSelect";
import { ProcessosTable } from "@/components/tables/ProcessosTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Processos" };

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
      <Breadcrumbs items={[{ label: "Processos" }]} />
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
        <ProcessosTable data={processos} q={q} status={status} />
      </div>
    </div>
  );
}
