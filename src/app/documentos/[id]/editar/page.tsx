import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EditEntityForm } from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const doc = await prisma.documento.findUnique({ where: { id: Number(id) } });
  if (!doc) notFound();

  return (
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
      ]}
      data={{
        nome: doc.nome,
        tipo: doc.tipo,
      }}
    />
  );
}
