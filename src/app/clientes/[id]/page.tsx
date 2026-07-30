import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getDiasFimTrimestre, getTrimestreAtual } from "@/lib/dmr-parser";
import { ClienteDetailClient } from "./ClienteDetailClient";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(id) },
    include: {
      empreendimentos: {
        include: {
          _count: { select: { processos: true } },
          controleDmr: true,
        },
        orderBy: { apelido: "asc" },
      },
      financeiros: { orderBy: { dataVencimento: "desc" } },
      documentosGerados: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!cliente) notFound();

  const diasFimTrimestre = getDiasFimTrimestre();
  const trimestre = getTrimestreAtual();

  return (
    <ClienteDetailClient
      cliente={JSON.parse(JSON.stringify(cliente))}
      id={id}
      diasFimTrimestre={diasFimTrimestre}
      trimestreLabel={trimestre.label}
    />
  );
}
