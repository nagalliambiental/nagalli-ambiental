export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { getDiasFimTrimestre, getTrimestreAtual } from "@/lib/dmr-parser";
import { ClienteDetailClient } from "./ClienteDetailClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UltimaModificacao } from "@/components/UltimaModificacao";
import { VisibilidadeBadge } from "@/components/VisibilidadeBadge";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) }, select: { apelido: true } });
  return { title: `Cliente - ${cliente?.apelido}` };
}

export default async function ClienteDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const perfil = (session.user as { perfil?: string }).perfil;
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

  if (!ehPrivilegiado(perfil) && cliente.visibilidade === "privado") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-ink-500">Acesso restrito a este cliente.</p>
      </div>
    );
  }

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
      <div className="mb-4 flex items-center gap-3">
        <VisibilidadeBadge visibilidade={cliente.visibilidade} />
      </div>
      <UltimaModificacao entidade="Cliente" entidadeId={cliente.id} />
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
