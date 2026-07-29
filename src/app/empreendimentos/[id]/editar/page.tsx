import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EditEntityForm } from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const emp = await prisma.empreendimento.findUnique({ where: { id: Number(id) } });
  if (!emp) notFound();

  return (
    <EditEntityForm
      entity="empreendimento"
      entityName="Empreendimento"
      endpoint={`/api/empreendimentos/${id}`}
      redirectTo={`/empreendimentos/${id}`}
      fields={[
        { name: "apelido", label: "Apelido", type: "text", required: true },
        { name: "cnpj", label: "CNPJ", type: "text" },
        { name: "cep", label: "CEP", type: "text" },
        { name: "municipio", label: "Município", type: "text" },
        { name: "uf", label: "UF", type: "text" },
        { name: "rua", label: "Rua", type: "text" },
        { name: "numero", label: "Número", type: "text" },
        { name: "bairro", label: "Bairro", type: "text" },
        { name: "complemento", label: "Complemento", type: "text" },
        { name: "descricao", label: "Descrição", type: "textarea" },
        { name: "latitude", label: "Latitude", type: "number" },
        { name: "longitude", label: "Longitude", type: "number" },
      ]}
      data={{
        apelido: emp.apelido,
        cnpj: emp.cnpj,
        cep: emp.cep,
        municipio: emp.municipio,
        uf: emp.uf,
        rua: emp.rua,
        numero: emp.numero,
        bairro: emp.bairro,
        complemento: emp.complemento,
        descricao: emp.descricao,
        latitude: emp.latitude,
        longitude: emp.longitude,
      }}
    />
  );
}
