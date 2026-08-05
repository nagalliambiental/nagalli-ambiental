import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Plus, FileSignature } from "lucide-react";
import { ContratoTable } from "@/components/tables/ContratoTable";
import { SearchBar } from "@/components/SearchBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contratos" };

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio" && perfil !== "admin") redirect("/");

  const where: Prisma.ContratoWhereInput = {};
  if (q) {
    where.OR = [
      { cliente: { apelido: { contains: q, mode: "insensitive" } } },
      { servicoProcesso: { contains: q, mode: "insensitive" } },
      { empreendimento: { apelido: { contains: q, mode: "insensitive" } } },
    ];
  }

  const registros = await prisma.contrato.findMany({
    where,
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Contratos" }]} />
      <Topbar
        icon={FileSignature}
        title="Contratos"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por cliente, serviço ou empreendimento..." />
            <Link
              href="/contratos/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo Contrato
            </Link>
          </div>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ContratoTable data={registros} />
      </div>
    </div>
  );
}
