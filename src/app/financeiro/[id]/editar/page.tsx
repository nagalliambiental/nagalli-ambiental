import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EditEntityForm } from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const reg = await prisma.financeiro.findUnique({ where: { id: Number(id) } });
  if (!reg) notFound();

  return (
    <EditEntityForm
      entity="financeiro"
      entityName="Registro Financeiro"
      endpoint={`/api/financeiro/${id}`}
      redirectTo={`/financeiro/${id}`}
      fields={[
        { name: "tipoCobranca", label: "Tipo de Cobrança", type: "text", required: true },
        { name: "valor", label: "Valor", type: "number", required: true },
        { name: "formaPagamento", label: "Forma de Pagamento", type: "text", required: true },
        { name: "statusPagamento", label: "Status", type: "select", required: true, options: [
          { value: "pendente", label: "Pendente" },
          { value: "pago", label: "Pago" },
          { value: "atrasado", label: "Atrasado" },
          { value: "cancelado", label: "Cancelado" },
        ] },
        { name: "dataVencimento", label: "Data Vencimento", type: "date" },
        { name: "dataPagamento", label: "Data Pagamento", type: "date" },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
      data={{
        tipoCobranca: reg.tipoCobranca,
        valor: reg.valor,
        formaPagamento: reg.formaPagamento,
        statusPagamento: reg.statusPagamento,
        dataVencimento: reg.dataVencimento?.toISOString(),
        dataPagamento: reg.dataPagamento?.toISOString(),
        descricao: reg.descricao,
      }}
    />
  );
}
