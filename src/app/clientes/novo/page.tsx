import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EditEntityForm from "@/components/EditEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novo Cliente" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Clientes", href: "/clientes" }, { label: "Novo" }]} />
      <EditEntityForm
      entity="cliente"
      entityName="Cliente"
      endpoint="/api/clientes"
      redirectTo="/clientes"
      method="POST"
      fields={[
        { name: "apelido", label: "Apelido", type: "text", required: true },
        { name: "razaoSocial", label: "Razão Social", type: "text", required: true },
        { name: "nomeFantasia", label: "Nome Fantasia", type: "text" },
        { name: "cnpj", label: "CNPJ", type: "text", required: true, search: "cnpj" },
        { name: "telefone", label: "Telefone", type: "text", required: true },
        { name: "email", label: "Email", type: "text", required: true },
        { name: "rua", label: "Rua", type: "text" },
        { name: "numero", label: "Número", type: "text" },
        { name: "bairro", label: "Bairro", type: "text" },
        { name: "complemento", label: "Complemento", type: "text" },
        { name: "cep", label: "CEP", type: "text", search: "cep" },
        { name: "municipio", label: "Município", type: "text" },
        { name: "uf", label: "UF", type: "text" },
        { name: "respLegal", label: "Resp. Legal", type: "text", required: true },
        { name: "responsavelTecnicoNome", label: "Resp. Técnico", type: "text" },
        { name: "responsavelTecnicoConselho", label: "Conselho do Resp. Técnico", type: "text" },
        { name: "responsavelTecnicoCpf", label: "CPF do Resp. Técnico", type: "text" },
        { name: "responsavelPgrsNome", label: "Resp. implantação PGRS", type: "text" },
        { name: "responsavelPgrsCargo", label: "Cargo resp. PGRS", type: "text" },
        { name: "ramoAtividade", label: "Ramo de atividade", type: "text" },
        { name: "ativo", label: "Ativo", type: "checkbox" },
      ]}
      data={{ ativo: true }}
    />
    </div>
  );
}
