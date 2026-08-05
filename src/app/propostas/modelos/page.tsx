import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ehPrivilegiado } from "@/lib/perfil";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Plus, FileStack } from "lucide-react";
import ModelosList, { type ModeloLinha } from "@/components/propostas/ModelosList";
import { getModelosEmbutidos } from "@/lib/propostas/modelos";

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

  const embutidos: ModeloLinha[] = getModelosEmbutidos().map((m) => ({
    id: null,
    slug: m.slug,
    nome: m.nome,
    descricao: m.descricao,
    prefixoArquivo: m.prefixoArquivo,
    campos: m.campos as unknown as Record<string, unknown>[],
    ativo: true,
    temTemplate: true,
    criadoEm: null,
    embutido: true,
  }));

  const serializados: ModeloLinha[] = modelos.map((m) => ({
    ...m,
    campos: (m.campos ?? []) as Record<string, unknown>[],
    temTemplate: Boolean(m.template),
    template: undefined,
    criadoEm: m.criadoEm.toISOString(),
    embutido: false,
  }));

  const linhas = [...embutidos, ...serializados];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Propostas", href: "/propostas" }, { label: "Modelos de Proposta" }]} />
      <Topbar
        icon={FileStack}
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
        <ModelosList modelos={linhas} />
      </div>
    </div>
  );
}
