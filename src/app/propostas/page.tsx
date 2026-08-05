import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Topbar } from "@/components/Topbar";
import { Plus, FileSignature } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import PropostasServicoList from "@/components/propostas/PropostasServicoList";
import { getModelosProposta } from "@/lib/propostas/modelos-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propostas de Serviços" };

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  const modeloNomes: Record<string, string> = {};
  for (const modelo of await getModelosProposta()) {
    modeloNomes[modelo.slug] = modelo.nome;
  }

  const where: Prisma.PropostaServicoWhereInput = {};
  if (q) {
    const qNum = Number(q);
    where.OR = [
      { modeloSlug: { contains: q, mode: "insensitive" } },
      ...(Number.isNaN(qNum)
        ? []
        : [{ numero: qNum }, { ano: qNum }]),
    ];
  }

  const propostas = await prisma.propostaServico.findMany({
    where,
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
  });

  const propostasSerializadas = propostas.map((p) => ({
    ...p,
    criadoEm: p.criadoEm.toISOString(),
    dados: (p.dados ?? {}) as Record<string, unknown>,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Propostas" }]} />
      <Topbar
        icon={FileSignature}
        title="Propostas de Serviços"
        subtitle="Propostas comerciais por tipo de serviço, com numeração sequencial e revisões."
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por modelo, número..." />
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
        <PropostasServicoList propostas={propostasSerializadas} modeloNomes={modeloNomes} />
      </div>
    </div>
  );
}
