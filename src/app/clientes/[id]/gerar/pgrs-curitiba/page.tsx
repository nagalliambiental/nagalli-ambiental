export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PgrsForm } from "@/components/PgrsForm";

export const dynamic = "force-dynamic";

export default async function GerarPgrsCuritibaPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;

  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(id) },
    include: {
      residuos: { orderBy: { ordem: "asc" } },
      empresasContratadas: { orderBy: { ordem: "asc" } },
    },
  });
  if (!cliente) notFound();

  return (
    <PgrsForm
      clienteId={cliente.id}
      clienteApelido={cliente.apelido}
      cliente={JSON.parse(JSON.stringify(cliente))}
      templateSlug="pgrs-curitiba"
    />
  );
}
