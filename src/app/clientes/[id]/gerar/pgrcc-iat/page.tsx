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

  const [cliente, configuracao, empresaConfig] = await Promise.all([
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
    prisma.empresaConfig.findFirst(),
  ]);
  if (!cliente) notFound();

  const empresa = (empresaConfig ?? {}) as Record<string, string | null | undefined>;
  const configCombinada = {
    ...(configuracao ?? {}),
    nomeEmpresa: empresa.razaoSocial ?? configuracao?.nomeEmpresa ?? "",
    cnpj: empresa.cnpj ?? configuracao?.cnpj ?? "",
    responsavelNome: "Claudia da Silva Leite Nagalli",
    responsavelEndereco: [empresa.rua, empresa.numero].filter(Boolean).join(", ") || configuracao?.responsavelEndereco || "",
    responsavelBairro: empresa.bairro ?? configuracao?.responsavelBairro ?? "",
    responsavelTelefone: empresa.telefone ?? configuracao?.responsavelTelefone ?? "",
    responsavelEmail: empresa.email ?? configuracao?.responsavelEmail ?? "",
  };

  return (
    <PgrccIatForm
      clienteId={cliente.id}
      clienteApelido={cliente.apelido}
      cliente={JSON.parse(JSON.stringify(cliente))}
      configuracoes={JSON.parse(JSON.stringify(configCombinada))}
    />
  );
}
