import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar Condicionante" };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const c = await prisma.condicionante.findUnique({ where: { id: Number(id) } });
  if (!c) redirect("/condicionantes");

  const processos = await prisma.processo.findMany({
    where: { ativo: true },
    select: { id: true, numProtocolo: true, tipo: true },
    orderBy: { numProtocolo: "desc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Condicionantes", href: "/condicionantes" }, { label: "Editar" }]} />
      <EditEntityForm
        entity="condicionante"
        entityName="Condicionante"
        endpoint={`/api/condicionantes/${c.id}`}
        redirectTo={`/condicionantes/${c.id}`}
        method="PUT"
        fields={[
          {
            name: "processoId",
            label: "Processo",
            type: "select",
            required: true,
            options: processos.map((p) => ({ value: String(p.id), label: `${p.numProtocolo} — ${p.tipo}` })),
          },
          { name: "descricao", label: "Descrição", type: "textarea", required: true },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pendente", label: "Pendente" },
              { value: "em_andamento", label: "Em Andamento" },
              { value: "cumprida", label: "Cumprida" },
              { value: "vencida", label: "Vencida" },
              { value: "suspensa", label: "Suspensa" },
            ],
          },
          { name: "prazo", label: "Prazo", type: "date" },
          { name: "dataCumprimento", label: "Data Cumprimento", type: "date" },
          { name: "responsavel", label: "Responsável", type: "text" },
          { name: "observacoes", label: "Observações", type: "textarea" },
        ]}
        data={{
          ...c,
          processoId: String(c.processoId),
          prazo: c.prazo ? c.prazo.toISOString().slice(0, 10) : "",
          dataCumprimento: c.dataCumprimento ? c.dataCumprimento.toISOString().slice(0, 10) : "",
        }}
      />
    </div>
  );
}
