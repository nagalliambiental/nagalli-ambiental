import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Topbar } from "@/components/Topbar";
import PropostaModeloForm from "@/components/propostas/PropostaModeloForm";
import { getModeloProposta } from "@/lib/propostas/modelos-server";
import { FileStack } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo Modelo de Proposta" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ duplicar?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) redirect("/");

  const { duplicar } = await searchParams;
  const origem = duplicar ? await getModeloProposta(duplicar) : null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Modelos de Proposta", href: "/propostas/modelos" },
          { label: origem ? `Novo a partir de "${origem.nome}"` : "Novo" },
        ]}
      />
      <Topbar
        icon={FileStack}
        title="Novo Modelo de Proposta"
        subtitle={
          origem
            ? `Configuração pré-preenchida a partir do modelo "${origem.nome}". Ajuste os dados e envie o DOCX para cadastrar.`
            : "Cadastre um novo tipo de proposta a partir de um DOCX."
        }
      />
      <div className="mx-auto max-w-4xl">
        <PropostaModeloForm
          inicial={
            origem
              ? {
                  nome: origem.nome,
                  descricao: origem.descricao,
                  prefixoArquivo: origem.prefixoArquivo,
                  campos: origem.campos,
                  ativo: true,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
