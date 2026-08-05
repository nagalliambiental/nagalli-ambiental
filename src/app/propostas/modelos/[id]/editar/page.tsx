import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ehPrivilegiado } from "@/lib/perfil";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Topbar } from "@/components/Topbar";
import PropostaModeloForm from "@/components/propostas/PropostaModeloForm";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) redirect("/");

  const { id } = await params;
  const modelo = await prisma.propostaModelo.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      nome: true,
      descricao: true,
      prefixoArquivo: true,
      campos: true,
      ativo: true,
    },
  });

  if (!modelo) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Modelos de Proposta", href: "/propostas/modelos" },
          { label: modelo.nome },
        ]}
      />
      <Topbar title={`Editar ${modelo.nome}`} subtitle="Atualize o modelo de proposta." />
      <div className="mx-auto max-w-4xl">
        <PropostaModeloForm
          id={modelo.id}
          inicial={{
            nome: modelo.nome,
            descricao: modelo.descricao,
            prefixoArquivo: modelo.prefixoArquivo,
            campos: (modelo.campos ?? []) as { name: string; label: string; tipo: "texto" | "numero" | "moeda" | "selecao" | "textarea"; grupo?: string; required?: boolean; dica?: string; opcoes?: string[] }[],
            ativo: modelo.ativo,
          }}
        />
      </div>
    </div>
  );
}
