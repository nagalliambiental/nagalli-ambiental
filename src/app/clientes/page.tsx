import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, Building2 } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GerarDocumentosButton } from "@/components/GerarDocumentosButton";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { ClientesAbas } from "@/components/ClientesAbas";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;

  const where: Prisma.ClienteWhereInput = {};
  if (!ehPrivilegiado(perfil)) where.visibilidade = "publico";

  const clientes = await prisma.cliente.findMany({
    where,
    include: {
      _count: { select: { empreendimentos: true } },
      empreendimentos: {
        select: { id: true, apelido: true, unidadeSinir: true },
        orderBy: { apelido: "asc" },
      },
    },
    orderBy: { apelido: "asc" },
  });

  const clientesParaAbas = clientes.map((c) => ({
    id: c.id,
    apelido: c.apelido,
    razaoSocial: c.razaoSocial,
    cnpj: c.cnpj,
    telefone: c.telefone || "",
    _count: { empreendimentos: c._count.empreendimentos },
    empreendimentos: c.empreendimentos,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Clientes" }]} />
      <Topbar
        icon={Building2}
        title="Clientes"
        actions={
          <div className="flex items-center gap-3">
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
        <ClientesAbas clientes={clientesParaAbas} />
      </div>
    </div>
  );
}