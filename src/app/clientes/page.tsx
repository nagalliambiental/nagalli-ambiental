import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, Building2, CheckCircle2, CircleSlash, MapPin } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GerarDocumentosButton } from "@/components/GerarDocumentosButton";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { ClientesTable } from "@/components/tables/ClientesTable";

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

  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter((c) => c.ativo).length;
  const clientesInativos = clientes.filter((c) => !c.ativo).length;
  const clientesComEmpreendimentos = clientes.filter(
    (c) => c._count.empreendimentos > 0
  ).length;

  const clientesParaTabela = clientes.map((c) => ({
    id: c.id,
    apelido: c.apelido,
    razaoSocial: c.razaoSocial,
    cnpj: c.cnpj,
    telefone: c.telefone || "",
    _count: { empreendimentos: c._count.empreendimentos },
    empreendimentos: c.empreendimentos.map((e) => ({ id: e.id, apelido: e.apelido })),
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

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Clientes" value={totalClientes} icon={Building2} accent="brand" />
        <StatCard label="Ativos" value={clientesAtivos} icon={CheckCircle2} accent="success" />
        <StatCard label="Inativos" value={clientesInativos} icon={CircleSlash} accent="danger" />
        <StatCard
          label="Com empreendimentos"
          value={clientesComEmpreendimentos}
          icon={MapPin}
          accent="river"
        />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ClientesTable data={clientesParaTabela} />
      </div>
    </div>
  );
}