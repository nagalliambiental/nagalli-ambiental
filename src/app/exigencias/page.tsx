import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { ExigenciasTable } from "@/components/tables/ExigenciasTable";
import { SearchBar } from "@/components/SearchBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exigências" };

export default async function ExigenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where: Prisma.ExigenciaWhereInput = {};
  if (q) {
    where.descricao = { contains: q, mode: "insensitive" };
  }

  const exigencias = await prisma.exigencia.findMany({
    where,
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
      <Breadcrumbs items={[{ label: "Exigências" }]} />
      <Topbar
        title="Exigências"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por descrição..." />
            <Link
              href="/exigencias/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Exigência
            </Link>
          </div>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ExigenciasTable data={exigencias} />
      </div>
    </div>
  );
}
