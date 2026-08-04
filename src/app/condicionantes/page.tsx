import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { CondicionantesTable } from "@/components/tables/CondicionantesTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Condicionantes" };

export default async function CondicionantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const where: Prisma.CondicionanteWhereInput = {};
  if (q) {
    where.OR = [
      { descricao: { contains: q, mode: "insensitive" } },
      { responsavel: { contains: q, mode: "insensitive" } },
      { processo: { numProtocolo: { contains: q, mode: "insensitive" } } },
    ];
  }

  const condicionantes = await prisma.condicionante.findMany({
    where,
    include: {
      processo: {
        include: {
          empreendimento: { select: { apelido: true } },
          orgao: { select: { sigla: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Condicionantes" }]} />
      <Topbar
        title="Condicionantes"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por descrição, processo..." />
            <Link
              href="/condicionantes/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Condicionante
            </Link>
          </div>
        }
      />
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <CondicionantesTable data={condicionantes} q={q} />
      </div>
    </div>
  );
}
