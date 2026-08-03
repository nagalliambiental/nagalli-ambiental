import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novo Empreendimento" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clientes = await prisma.cliente.findMany({
    select: { id: true, apelido: true },
    orderBy: { apelido: "asc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Empreendimentos", href: "/empreendimentos" }, { label: "Novo" }]} />
      <EditEntityForm
      entity="empreendimento"
      entityName="Empreendimento"
      endpoint="/api/empreendimentos"
      redirectTo="/empreendimentos"
      method="POST"
      fields={[
        { name: "apelido", label: "Apelido", type: "text", required: true },
        {
          name: "clienteId", label: "Cliente", type: "select", required: true,
          options: clientes.map((c) => ({ value: String(c.id), label: c.apelido })),
        },
        { name: "cnpj", label: "CNPJ", type: "text" },
        { name: "cep", label: "CEP", type: "text", search: "cep" },
        { name: "municipio", label: "Município", type: "text" },
        { name: "uf", label: "UF", type: "text" },
        { name: "rua", label: "Rua", type: "text" },
        { name: "numero", label: "Número", type: "text" },
        { name: "bairro", label: "Bairro", type: "text" },
        { name: "complemento", label: "Complemento", type: "text" },
        { name: "descricao", label: "Descrição", type: "textarea", required: true },
        { name: "latitude", label: "Latitude", type: "number" },
        { name: "longitude", label: "Longitude", type: "number" },
        { name: "visibilidade", label: "Visibilidade", type: "select", adminOnly: true, options: [{ value: "publico", label: "Público" }, { value: "privado", label: "Privado" }] },
        { name: "ativo", label: "Ativo", type: "checkbox" },
      ]}
      data={{ ativo: true, visibilidade: "publico" }}
    />
    </div>
  );
}
