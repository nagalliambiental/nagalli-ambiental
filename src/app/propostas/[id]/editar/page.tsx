import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar Proposta" };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const proposta = await prisma.proposta.findUnique({ where: { id: Number(id) } });
  if (!proposta) redirect("/propostas");

  const [clientes, empreendimentos] = await Promise.all([
    prisma.cliente.findMany({
      where: { ativo: true },
      select: { id: true, apelido: true },
      orderBy: { apelido: "asc" },
    }),
    prisma.empreendimento.findMany({
      where: { ativo: true },
      select: { id: true, apelido: true },
      orderBy: { apelido: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Propostas", href: "/propostas" }, { label: "Editar" }]} />
      <EditEntityForm
        entity="proposta"
        entityName="Proposta"
        endpoint={`/api/propostas/${proposta.id}`}
        redirectTo={`/propostas/${proposta.id}`}
        method="PUT"
        fields={[
          { name: "titulo", label: "Título", type: "text", required: true },
          {
            name: "clienteId",
            label: "Cliente",
            type: "select",
            required: true,
            options: clientes.map((c) => ({ value: String(c.id), label: c.apelido })),
          },
          {
            name: "empreendimentoId",
            label: "Empreendimento",
            type: "select",
            options: empreendimentos.map((e) => ({ value: String(e.id), label: e.apelido })),
          },
          { name: "valor", label: "Valor (R$)", type: "number" },
          { name: "validadeDias", label: "Validade (dias)", type: "number" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "rascunho", label: "Rascunho" },
              { value: "enviada", label: "Enviada" },
              { value: "aprovada", label: "Aprovada" },
              { value: "rejeitada", label: "Rejeitada" },
            ],
          },
          { name: "observacoes", label: "Observações", type: "textarea" },
        ]}
        data={{
          ...proposta,
          clienteId: String(proposta.clienteId),
          empreendimentoId: proposta.empreendimentoId ? String(proposta.empreendimentoId) : "",
          valor: proposta.valor ?? "",
          validadeDias: proposta.validadeDias,
        }}
      />
    </div>
  );
}
