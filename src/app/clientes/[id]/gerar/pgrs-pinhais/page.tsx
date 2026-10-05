export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PgrsForm } from "@/components/PgrsForm";

export const dynamic = "force-dynamic";

export default async function GerarPgrsPinhaisPage(props: { params: Promise<{ id: string }> }) {
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

  const anterior = await prisma.documentoGerado.findFirst({
    where: { clienteId: cliente.id, templateSlug: { startsWith: "pgrs-" } },
    orderBy: { createdAt: "desc" },
    select: { dadosSnapshot: true },
  });

  return (
    <PgrsForm
      clienteId={cliente.id}
      clienteApelido={cliente.apelido}
      cliente={JSON.parse(JSON.stringify(cliente))}
      templateSlug="pgrs-pinhais"
      reaproveitar={(anterior?.dadosSnapshot as Record<string, unknown> | null) ?? null}
    />
  );
}
