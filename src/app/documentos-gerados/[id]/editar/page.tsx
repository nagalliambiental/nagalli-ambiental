export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EditarDocumentoGeradoClient } from "./EditarDocumentoGeradoClient";

export const dynamic = "force-dynamic";

export default async function EditarDocumentoGeradoPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;

  const doc = await prisma.documentoGerado.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: {
        select: {
          id: true,
          apelido: true,
          razaoSocial: true,
        },
      },
    },
  });
  if (!doc) notFound();

  const cliente = await prisma.cliente.findUnique({
    where: { id: doc.clienteId },
    include: {
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
      residuos: { orderBy: { ordem: "asc" } },
      empresasContratadas: { orderBy: { ordem: "asc" } },
    },
  });
  if (!cliente) notFound();

  const [configuracao, empresaConfig] = await Promise.all([
    prisma.configuracao.findFirst(),
    prisma.empresaConfig.findFirst(),
  ]);

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
    <EditarDocumentoGeradoClient
      docId={doc.id}
      templateSlug={doc.templateSlug}
      dadosSnapshot={doc.dadosSnapshot as Record<string, unknown>}
      empreendimentoId={doc.empreendimentoId}
      clienteId={doc.clienteId}
      clienteApelido={doc.cliente.apelido}
      cliente={JSON.parse(JSON.stringify(cliente))}
      configuracoes={JSON.parse(JSON.stringify(configCombinada))}
    />
  );
}
