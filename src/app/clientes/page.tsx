import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ClientesTable } from "@/components/tables/ClientesTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GerarDocumentosButton } from "@/components/GerarDocumentosButton";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;

  const where: Prisma.ClienteWhereInput = {};
  if (!ehPrivilegiado(perfil)) where.visibilidade = "publico";
  if (q) {
    where.OR = [
      { apelido: { contains: q, mode: "insensitive" } },
      { razaoSocial: { contains: q, mode: "insensitive" } },
      { cnpj: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const clientes = await prisma.cliente.findMany({
    where,
    include: {
      _count: { select: { empreendimentos: true } },
      empreendimentos: { select: { id: true, apelido: true }, orderBy: { apelido: "asc" } },
    },
    orderBy: { apelido: "asc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Clientes" }]} />
      <Topbar
        title="Clientes"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por nome, CNPJ ou email..." />
            <GerarDocumentosButton />
            <Link
              href="/clientes/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo Cliente
            </Link>
          </div>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ClientesTable data={clientes} q={q} />
      </div>
    </div>
  );
}
