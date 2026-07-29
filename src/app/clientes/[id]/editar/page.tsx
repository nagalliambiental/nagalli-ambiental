import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) } });
  if (!cliente) notFound();

  return (
    <EditEntityForm
      entity="cliente"
      entityName="Cliente"
      endpoint={`/api/clientes/${id}`}
      redirectTo={`/clientes/${id}`}
      fields={[
        { name: "apelido", label: "Apelido", type: "text", required: true },
        { name: "razaoSocial", label: "Razão Social", type: "text", required: true },
        { name: "nomeFantasia", label: "Nome Fantasia", type: "text" },
        { name: "cnpj", label: "CNPJ", type: "text", required: true },
        { name: "telefone", label: "Telefone", type: "text", required: true },
        { name: "email", label: "Email", type: "text", required: true },
        { name: "rua", label: "Rua", type: "text" },
        { name: "numero", label: "Número", type: "text" },
        { name: "bairro", label: "Bairro", type: "text" },
        { name: "complemento", label: "Complemento", type: "text" },
        { name: "cep", label: "CEP", type: "text" },
        { name: "municipio", label: "Município", type: "text" },
        { name: "uf", label: "UF", type: "text" },
        { name: "respLegal", label: "Resp. Legal", type: "text", required: true },
        { name: "dirigenteNome", label: "Dirigente", type: "text" },
        { name: "dirigenteCargo", label: "Cargo do dirigente", type: "text" },
        { name: "responsavelPgrsNome", label: "Resp. implantação PGRS", type: "text" },
        { name: "responsavelPgrsCargo", label: "Cargo resp. PGRS", type: "text" },
        { name: "ramoAtividade", label: "Ramo de atividade", type: "text" },
      ]}
      data={{
        apelido: cliente.apelido,
        razaoSocial: cliente.razaoSocial,
        nomeFantasia: cliente.nomeFantasia,
        cnpj: cliente.cnpj,
        telefone: cliente.telefone,
        email: cliente.email,
        rua: cliente.rua,
        numero: cliente.numero,
        bairro: cliente.bairro,
        complemento: cliente.complemento,
        cep: cliente.cep,
        municipio: cliente.municipio,
        uf: cliente.uf,
        respLegal: cliente.respLegal,
        dirigenteNome: cliente.dirigenteNome || "",
        dirigenteCargo: cliente.dirigenteCargo || "",
        responsavelPgrsNome: cliente.responsavelPgrsNome || "",
        responsavelPgrsCargo: cliente.responsavelPgrsCargo || "",
        ramoAtividade: cliente.ramoAtividade || "",
      }}
    />
  );
}
