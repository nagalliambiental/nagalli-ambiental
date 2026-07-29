import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const exigencia = await prisma.exigencia.findUnique({ where: { id: Number(id) } });
  if (!exigencia) notFound();

  return (
    <EditEntityForm
      entity="exigencia"
      entityName="Exigência"
      endpoint={`/api/exigencias/${id}`}
      redirectTo={`/exigencias/${id}`}
      fields={[
        { name: "descricao", label: "Descrição", type: "textarea", required: true },
        { name: "prazo", label: "Prazo", type: "date", required: true },
        { name: "antecedenciaDias", label: "Antecedência (dias)", type: "number", required: true },
        { name: "cumprida", label: "Cumprida", type: "select", options: [
          { value: "true", label: "Sim" },
          { value: "false", label: "Não" },
        ] },
        { name: "ativo", label: "Ativo", type: "checkbox" },
      ]}
      data={{
        descricao: exigencia.descricao,
        prazo: exigencia.prazo.toISOString(),
        antecedenciaDias: exigencia.antecedenciaDias,
        cumprida: exigencia.cumprida ? "true" : "false",
        ativo: exigencia.ativo,
      }}
    />
  );
}
