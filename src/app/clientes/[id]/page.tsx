export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getDiasFimTrimestre, getTrimestreAtual } from "@/lib/dmr-parser";
import { ClienteDetailClient } from "./ClienteDetailClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) }, select: { apelido: true } });
  return { title: `Cliente - ${cliente?.apelido}` };
}

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

  const documentos = await prisma.documento.findMany({
    where: {
      OR: [
        { clienteId: Number(id) },
        { processo: { empreendimento: { clienteId: Number(id) } } },
        { exigencia: { processo: { empreendimento: { clienteId: Number(id) } } } },
      ],
    },
    orderBy: { criadoEm: "desc" },
  });

  const diasFimTrimestre = getDiasFimTrimestre();
  const trimestre = getTrimestreAtual();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Clientes", href: "/clientes" }, { label: cliente.apelido }]} />
      <ClienteDetailClient
      cliente={JSON.parse(JSON.stringify(cliente))}
      documentos={JSON.parse(JSON.stringify(documentos))}
      id={id}
      diasFimTrimestre={diasFimTrimestre}
      trimestreLabel={trimestre.label}
    />
    </div>
  );
}
