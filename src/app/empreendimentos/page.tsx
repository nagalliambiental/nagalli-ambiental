import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ImportCard } from "@/components/ImportCard";
import { EmpreendimentosTable } from "@/components/tables/EmpreendimentosTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GerarDocumentosButton } from "@/components/GerarDocumentosButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Empreendimentos" };

export default async function EmpreendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const where: Prisma.EmpreendimentoWhereInput = {};
  if (q) {
    where.OR = [
      { apelido: { contains: q, mode: "insensitive" } },
      { descricao: { contains: q, mode: "insensitive" } },
      { cliente: { apelido: { contains: q, mode: "insensitive" } } },
    ];
  }

  const empreendimentos = await prisma.empreendimento.findMany({
    where,
    include: {
      cliente: { select: { id: true, apelido: true } },
      _count: { select: { processos: true } },
    },
    orderBy: { apelido: "asc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Empreendimentos" }]} />
      <Topbar
        title="Empreendimentos"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por nome, cliente ou descrição..." />
            <GerarDocumentosButton empreendimentoMode />
            <Link
              href="/empreendimentos/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo Empreendimento
            </Link>
          </div>
        }
      />

      <ImportCard
        importEndpoint="/api/cadastros/importar"
        exportEndpoint="/api/cadastros/exportar"
        modelEndpoint="/api/cadastros/modelo"
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <EmpreendimentosTable data={empreendimentos} q={q} />
      </div>
    </div>
  );
}
