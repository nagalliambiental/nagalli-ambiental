import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova Condicionante" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const processos = await prisma.processo.findMany({
    where: { ativo: true },
    select: { id: true, numProtocolo: true, tipo: true },
    orderBy: { numProtocolo: "desc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Condicionantes", href: "/condicionantes" }, { label: "Nova" }]} />
      <EditEntityForm
        entity="condicionante"
        entityName="Condicionante"
        endpoint="/api/condicionantes"
        redirectTo="/condicionantes"
        method="POST"
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
          { name: "responsavel", label: "Responsável", type: "text" },
          { name: "observacoes", label: "Observações", type: "textarea" },
        ]}
        data={{ status: "pendente" }}
      />
    </div>
  );
}
