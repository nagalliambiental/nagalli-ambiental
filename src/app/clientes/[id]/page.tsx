export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { getDiasFimTrimestre, getTrimestreAtual } from "@/lib/dmr-parser";
import { ClienteDetailClient } from "./ClienteDetailClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UltimaModificacao } from "@/components/UltimaModificacao";

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

  const [cliente, documentos] = await Promise.all([
    prisma.cliente.findUnique({
      where: { id: Number(id) },
      select: {
        id: true, apelido: true, razaoSocial: true, cnpj: true, telefone: true, email: true, respLegal: true, visibilidade: true, criadoEm: true,
        empreendimentos: {
          select: {
            id: true, apelido: true, municipio: true, uf: true, rua: true, numero: true, bairro: true,
            _count: { select: { processos: true } },
            controleDmr: { select: { id: true, ano: true, t1Dmr: true, t2Dmr: true, t3Dmr: true, t4Dmr: true, t1Mtr: true, t2Mtr: true, t3Mtr: true, t4Mtr: true } },
          },
          orderBy: { apelido: "asc" },
        },
        financeiros: {
          orderBy: { dataVencimento: "desc" },
          select: {
            id: true, tipoCobranca: true, valor: true, dataVencimento: true, dataPagamento: true,
            statusPagamento: true, descricao: true, criadoEm: true, processoId: true,
          },
        },
        documentosGerados: {
          orderBy: { createdAt: "desc" }, take: 20,
          select: { id: true, templateSlug: true, createdAt: true, caminho: true },
        },
      },
    }),
    prisma.documento.findMany({
      where: {
        OR: [
          { clienteId: Number(id) },
          { processo: { empreendimento: { clienteId: Number(id) } } },
          { exigencia: { processo: { empreendimento: { clienteId: Number(id) } } } },
        ],
      },
      orderBy: { criadoEm: "desc" },
      select: { id: true, nome: true, tipo: true, caminho: true, tamanho: true, criadoEm: true, processoId: true },
    }),
  ]);
  if (!cliente) notFound();

  if (!ehPrivilegiado(perfil) && cliente.visibilidade === "privado") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-ink-500">Acesso restrito a este cliente.</p>
      </div>
    );
  }

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
      ultimaModificacao={<UltimaModificacao entidade="Cliente" entidadeId={cliente.id} />}
    />
    </div>
  );
}
