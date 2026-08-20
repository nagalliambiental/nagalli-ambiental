export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const emp = await prisma.empreendimento.findUnique({ where: { id: Number(id) }, select: { apelido: true } });
  return { title: `Editar - ${emp?.apelido}` };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const emp = await prisma.empreendimento.findUnique({ where: { id: Number(id) } });
  if (!emp) notFound();

  const clientes = await prisma.cliente.findMany({
    select: { id: true, apelido: true },
    orderBy: { apelido: "asc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Empreendimentos", href: "/empreendimentos" }, { label: emp.apelido, href: `/empreendimentos/${emp.id}` }, { label: "Editar" }]} />
      <EditEntityForm
      entity="empreendimento"
      entityName="Empreendimento"
      endpoint={`/api/empreendimentos/${id}`}
      redirectTo={`/empreendimentos/${id}`}
      fields={[
        { name: "apelido", label: "Apelido", type: "text", required: true },
        {
          name: "clienteId", label: "Cliente", type: "select", required: true,
          options: clientes.map((c) => ({ value: String(c.id), label: c.apelido })),
        },
        { name: "cnpj", label: "CNPJ", type: "text" },
        { name: "unidadeSinir", label: "Unidade do SINIR", type: "text" },
        { name: "cep", label: "CEP", type: "text", search: "cep" },
        { name: "municipio", label: "Município", type: "text" },
        { name: "uf", label: "UF", type: "text" },
        { name: "rua", label: "Rua", type: "text" },
        { name: "numero", label: "Número", type: "text" },
        { name: "bairro", label: "Bairro", type: "text" },
        { name: "complemento", label: "Complemento", type: "text" },
        { name: "descricao", label: "Descrição", type: "textarea" },
        { name: "latitude", label: "Latitude", type: "number", step: "any" },
        { name: "longitude", label: "Longitude", type: "number", step: "any" },
        { name: "utmX", label: "UTM X (Easting)", type: "number", step: "any" },
        { name: "utmY", label: "UTM Y (Northing)", type: "number", step: "any" },
        { name: "utmZona", label: "UTM Zona", type: "number" },
        { name: "utmHemisferio", label: "UTM Hemisfério", type: "select", options: [{ value: "N", label: "Norte" }, { value: "S", label: "Sul" }] },
        { name: "visibilidade", label: "Visibilidade", type: "select", adminOnly: true, options: [{ value: "publico", label: "Público" }, { value: "privado", label: "Privado" }] },
        { name: "ativo", label: "Ativo", type: "checkbox" },
      ]}
      data={{
        apelido: emp.apelido,
        clienteId: String(emp.clienteId),
        cnpj: emp.cnpj,
        unidadeSinir: emp.unidadeSinir,
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
        utmX: emp.utmX,
        utmY: emp.utmY,
        utmZona: emp.utmZona,
        utmHemisferio: emp.utmHemisferio,
        visibilidade: emp.visibilidade,
        ativo: emp.ativo,
      }}
    />
    </div>
  );
}
