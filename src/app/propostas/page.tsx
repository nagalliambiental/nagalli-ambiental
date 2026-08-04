import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, Wrench } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { PropostasTable } from "@/components/tables/PropostasTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propostas Comerciais" };

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const where: Prisma.PropostaWhereInput = {};
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { cliente: { apelido: { contains: q, mode: "insensitive" } } },
    ];
  }

  const propostas = await prisma.proposta.findMany({
    where,
    include: {
      cliente: { select: { apelido: true } },
      empreendimento: { select: { apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Propostas" }]} />
      <Topbar
        title="Propostas Comerciais"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/propostas/demolicao"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-ink-300)] px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-gray-50"
            >
              <Wrench size={16} />
              Propostas de Demolição (PGRCC/RGRCC)
            </Link>
            <SearchBar placeholder="Buscar por título, cliente..." />
            <Link
              href="/propostas/nova"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Proposta
            </Link>
          </div>
        }
      />
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <PropostasTable data={propostas} q={q} />
      </div>
    </div>
  );
}
