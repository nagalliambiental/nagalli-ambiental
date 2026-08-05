import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import PropostaServicoForm from "@/components/propostas/PropostaServicoForm";
import { getModeloProposta } from "@/lib/propostas/modelos-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const proposta = await prisma.propostaServico.findUnique({ where: { id: Number(id) }, select: { numero: true, ano: true } });
  return { title: `Editar Proposta ${proposta?.numero}/${proposta?.ano}` };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const proposta = await prisma.propostaServico.findUnique({ where: { id: Number(id) } });
  if (!proposta) notFound();

  const modelo = await getModeloProposta(proposta.modeloSlug);
  if (!modelo) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: `${proposta.numero}/${proposta.ano}`, href: `/propostas/${proposta.id}` },
          { label: "Editar" },
        ]}
      />
      <PropostaServicoForm
        modelo={modelo}
        propostaId={proposta.id}
        revisaoAtual={proposta.revisao}
        inicial={(proposta.dados ?? {}) as Record<string, unknown>}
      />
    </div>
  );
}
