import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { DollarSign, Plus } from "lucide-react";
import { FinanceiroTable } from "@/components/tables/FinanceiroTable";
import { SearchBar } from "@/components/SearchBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio" && perfil !== "admin") redirect("/");

  const where: Prisma.FinanceiroWhereInput = {};
  if (q) {
    where.OR = [
      { descricao: { contains: q, mode: "insensitive" } },
      { cliente: { apelido: { contains: q, mode: "insensitive" } } },
    ];
  }

  const registros = await prisma.financeiro.findMany({
    where,
    include: {
      cliente: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <Topbar
        icon={DollarSign}
        title="Financeiro"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por descrição ou cliente..." />
            <Link
              href="/financeiro/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Cobrança
            </Link>
          </div>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <FinanceiroTable data={registros} />
      </div>
    </div>
  );
}
