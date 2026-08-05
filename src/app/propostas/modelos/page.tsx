import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ehPrivilegiado } from "@/lib/perfil";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Plus } from "lucide-react";
import ModelosList from "@/components/propostas/ModelosList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modelos de Proposta" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) redirect("/");

  const modelos = await prisma.propostaModelo.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      slug: true,
      nome: true,
      descricao: true,
      prefixoArquivo: true,
      campos: true,
      ativo: true,
      template: true,
      criadoEm: true,
    },
  });

  const serializados = modelos.map((m) => ({
    ...m,
    campos: (m.campos ?? []) as Record<string, unknown>[],
    temTemplate: Boolean(m.template),
    template: undefined,
    criadoEm: m.criadoEm.toISOString(),
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Propostas", href: "/propostas" }, { label: "Modelos de Proposta" }]} />
      <Topbar
        title="Modelos de Proposta"
        subtitle="Cadastre novos tipos de proposta a partir de um DOCX e defina os campos editáveis."
        actions={
          <Link
            href="/propostas/modelos/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Novo Modelo
          </Link>
        }
      />
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ModelosList modelos={serializados} />
      </div>
    </div>
  );
}
