export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import EditEntityForm from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const doc = await prisma.documento.findUnique({ where: { id: Number(id) } });
  return { title: `Editar - ${doc?.nome || "Não encontrado"}` };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const doc = await prisma.documento.findUnique({ where: { id: Number(id) } });
  if (!doc) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Documentos", href: "/documentos" }, { label: doc.nome, href: `/documentos/${id}` }, { label: "Editar" }]} />
      <EditEntityForm
      entity="documento"
      entityName="Documento"
      endpoint={`/api/documentos/${id}`}
      redirectTo={`/documentos/${id}`}
      fields={[
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "tipo", label: "Tipo", type: "select", required: true, options: [
          { value: "licenca", label: "Licença" },
          { value: "parecer", label: "Parecer" },
          { value: "oficio", label: "Ofício" },
          { value: "laudo", label: "Laudo" },
          { value: "relatorio", label: "Relatório" },
          { value: "contrato", label: "Contrato" },
          { value: "anexo", label: "Anexo" },
          { value: "outro", label: "Outro" },
        ] },
        { name: "ativo", label: "Ativo", type: "checkbox" },
      ]}
      data={{
        nome: doc.nome,
        tipo: doc.tipo,
        ativo: doc.ativo,
      }}
    />
    </div>
  );
}
