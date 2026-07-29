import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) } });
  if (!tarefa) notFound();

  return (
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
          { value: "em_andamento", label: "Em Andamento" },
          { value: "concluida", label: "Concluída" },
          { value: "cancelada", label: "Cancelada" },
        ] },
        { name: "prioridade", label: "Prioridade", type: "select", required: true, options: [
          { value: "baixa", label: "Baixa" },
          { value: "media", label: "Média" },
          { value: "alta", label: "Alta" },
          { value: "urgente", label: "Urgente" },
        ] },
        { name: "dataVencimento", label: "Data de Vencimento", type: "date" },
      ]}
      data={{
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        status: tarefa.status,
        prioridade: tarefa.prioridade,
        dataVencimento: tarefa.dataVencimento?.toISOString(),
      }}
    />
  );
}
