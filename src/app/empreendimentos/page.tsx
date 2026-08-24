import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, MapPin, CheckCircle2, CircleSlash } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EmpreendimentosTable } from "@/components/tables/EmpreendimentosTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GerarDocumentosButton } from "@/components/GerarDocumentosButton";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";

export const dynamic = "force-dynamic";

export const metadata = { title: "Empreendimentos" };

export default async function EmpreendimentosPage() {
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;

  const where: Prisma.EmpreendimentoWhereInput = {};
  if (!ehPrivilegiado(perfil)) where.visibilidade = "publico";

  const empreendimentos = await prisma.empreendimento.findMany({
    where,
    include: {
      cliente: { select: { id: true, apelido: true } },
      _count: { select: { processos: true } },
    },
    orderBy: { apelido: "asc" },
  });

  const totalEmpreendimentos = empreendimentos.length;
  const empreendimentosAtivos = empreendimentos.filter((e) => e.ativo).length;
  const empreendimentosInativos = empreendimentos.filter((e) => !e.ativo).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Empreendimentos" }]} />
      <Topbar
        icon={MapPin}
        title="Empreendimentos"
        actions={
          <div className="flex items-center gap-3">
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

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Empreendimentos"
          value={totalEmpreendimentos}
          icon={MapPin}
          accent="brand"
        />
        <StatCard
          label="Ativos"
          value={empreendimentosAtivos}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Inativos"
          value={empreendimentosInativos}
          icon={CircleSlash}
          accent="danger"
        />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <EmpreendimentosTable data={empreendimentos} />
      </div>
    </div>
  );
}
