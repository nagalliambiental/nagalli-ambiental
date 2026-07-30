import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Editar Tarefa" };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) } });
  if (!tarefa) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Tarefas", href: "/tarefas" }, { label: "Tarefa", href: `/tarefas/${id}` }, { label: "Editar" }]} />
      <EditEntityForm
      entity="tarefa"
      entityName="Tarefa"
      endpoint={`/api/tarefas/${id}`}
      redirectTo={`/tarefas/${id}`}
      fields={[
        { name: "titulo", label: "Título", type: "text", required: true },
        { name: "descricao", label: "Descrição", type: "textarea" },
        { name: "status", label: "Status", type: "select", required: true, options: [
          { value: "pendente", label: "Pendente" },
          { value: "andamento", label: "Em Andamento" },
          { value: "aguardando", label: "Aguardando" },
          { value: "concluido", label: "Concluído" },
        ] },
        { name: "prioridade", label: "Prioridade", type: "select", required: true, options: [
          { value: "baixa", label: "Baixa" }, { value: "media", label: "Média" },
          { value: "alta", label: "Alta" }, { value: "urgente", label: "Urgente" },
        ] },
        { name: "dataVencimento", label: "Data de Vencimento", type: "date" },
        { name: "ativo", label: "Ativo", type: "checkbox" },
        { name: "statusObs", label: "Observação da mudança", type: "textarea" },
      ]}
      data={{
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        status: tarefa.status,
        prioridade: tarefa.prioridade,
        dataVencimento: tarefa.dataVencimento?.toISOString(),
        ativo: tarefa.ativo,
        statusObs: tarefa.statusObs,
      }}
    />
    </div>
  );
}
