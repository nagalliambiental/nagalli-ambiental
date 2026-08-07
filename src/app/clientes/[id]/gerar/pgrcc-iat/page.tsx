export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PgrccIatForm } from "@/components/PgrccIatForm";

export const dynamic = "force-dynamic";

export default async function PgrccIatPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;

  const [cliente, configuracao] = await Promise.all([
    prisma.cliente.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        apelido: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        telefone: true,
        email: true,
        respLegal: true,
        cep: true,
        municipio: true,
        uf: true,
        rua: true,
        numero: true,
        bairro: true,
        complemento: true,
        responsavelElaboracaoNome: true,
        responsavelElaboracaoCpf: true,
        responsavelElaboracaoEndereco: true,
        responsavelElaboracaoBairro: true,
        responsavelElaboracaoEmail: true,
        responsavelElaboracaoTelefone: true,
        responsavelElaboracaoEmpresaNome: true,
        responsavelElaboracaoEmpresaCnpj: true,
        responsavelElaboracaoRegistroCrq: true,
        empreendimentos: {
          select: {
            id: true,
            apelido: true,
            descricao: true,
            cnpj: true,
            cep: true,
            municipio: true,
            uf: true,
            rua: true,
            numero: true,
            bairro: true,
          },
          orderBy: { apelido: "asc" },
        },
      },
    }),
    prisma.configuracao.findFirst(),
  ]);
  if (!cliente) notFound();

  return (
    <PgrccIatForm
      clienteId={cliente.id}
      clienteApelido={cliente.apelido}
      cliente={JSON.parse(JSON.stringify(cliente))}
      configuracoes={configuracao ? JSON.parse(JSON.stringify(configuracao)) : null}
    />
  );
}
