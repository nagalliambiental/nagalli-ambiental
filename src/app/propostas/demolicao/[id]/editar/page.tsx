import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PropostaDemolicaoEditForm from "./PropostaDemolicaoEditForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar Proposta Demolição" };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const proposta = await prisma.propostaDemolicao.findUnique({ where: { id: Number(id) } });
  if (!proposta) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "PGRCC e RGRCC (Demolição)", href: "/propostas/demolicao" },
          { label: `${proposta.numero}/${proposta.ano}`, href: `/propostas/demolicao/${proposta.id}` },
          { label: "Editar" },
        ]}
      />
      <PropostaDemolicaoEditForm proposta={proposta} />
    </div>
  );
}