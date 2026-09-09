export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import TarefaForm, { TarefaFormInitial } from "@/components/TarefaForm";

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

  const initial: TarefaFormInitial = {
    id: tarefa.id,
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    status: tarefa.status,
    prioridade: tarefa.prioridade,
    prazoFinal: tarefa.prazoFinal ? tarefa.prazoFinal.toISOString() : null,
    alertaPrazoFinal: tarefa.alertaPrazoFinal,
    dataLimite: tarefa.dataLimite ? tarefa.dataLimite.toISOString() : null,
    alertaDataLimite: tarefa.alertaDataLimite,
    responsavelId: tarefa.responsavelId,
    empreendimentoId: tarefa.empreendimentoId,
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Tarefas", href: "/tarefas" }, { label: "Tarefa", href: `/tarefas/${id}` }, { label: "Editar" }]} />
      <div className="mx-auto max-w-2xl">
        <TarefaForm modo="editar" endpoint={`/api/tarefas/${id}`} redirectTo={`/tarefas/${id}`} initial={initial} />
      </div>
    </div>
  );
}