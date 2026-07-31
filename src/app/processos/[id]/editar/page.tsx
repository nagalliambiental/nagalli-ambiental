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
  const processo = await prisma.processo.findUnique({ where: { id: Number(id) } });
  return { title: `Editar - ${processo?.numProtocolo || "Não encontrado"}` };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const processo = await prisma.processo.findUnique({ where: { id: Number(id) } });
  if (!processo) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Processos", href: "/processos" }, { label: processo.numProtocolo, href: `/processos/${id}` }, { label: "Editar" }]} />
      <EditEntityForm
      entity="processo"
      entityName="Processo"
      endpoint={`/api/processos/${id}`}
      redirectTo={`/processos/${id}`}
      fields={[
        { name: "tipo", label: "Tipo", type: "text", required: true },
        { name: "numProtocolo", label: "Nº Protocolo", type: "text", required: true, search: "sia" },
        { name: "numLicenca", label: "Nº Licença", type: "text" },
        { name: "sistema", label: "Sistema", type: "text", required: true },
        { name: "status", label: "Status", type: "select", required: true, options: [
          { value: "protocolado", label: "Protocolado" },
          { value: "em_andamento", label: "Em Andamento" },
          { value: "exigencia_recebida", label: "Exigência Recebida" },
          { value: "deferido", label: "Deferido" },
          { value: "indeferido", label: "Indeferido" },
          { value: "arquivado", label: "Arquivado" },
        ] },
        { name: "validade", label: "Validade", type: "date" },
        { name: "dataProtocolo", label: "Data Protocolo", type: "date" },
        { name: "dataContato", label: "Data Contato", type: "date" },
        { name: "alertaDias", label: "Alerta (dias)", type: "number" },
        { name: "condicionantes", label: "Condicionantes", type: "textarea" },
        { name: "observacoes", label: "Observações", type: "textarea" },
        { name: "ativo", label: "Ativo", type: "checkbox" },
      ]}
      data={{
        tipo: processo.tipo,
        numProtocolo: processo.numProtocolo,
        numLicenca: processo.numLicenca,
        sistema: processo.sistema,
        status: processo.status,
        validade: processo.validade?.toISOString(),
        dataProtocolo: processo.dataProtocolo?.toISOString(),
        dataContato: processo.dataContato?.toISOString(),
        alertaDias: processo.alertaDias,
        condicionantes: processo.condicionantes,
        observacoes: processo.observacoes,
        ativo: processo.ativo,
      }}
    />
    </div>
  );
}
