export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Users } from "lucide-react";
import EditEntityForm from "@/components/EditEntityForm";

export const dynamic = "force-dynamic";

export default async function EditarUsuarioPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const privilegiado = ehPrivilegiado((session.user as Record<string, unknown>)?.perfil as string);
  if (!privilegiado) {
    const { id } = await props.params;
    redirect(`/usuarios/${id}`);
  }

  const { id } = await props.params;
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      cpf: true,
      conselho: true,
      criadoEm: true,
    },
  });
  if (!usuario) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Usuários", href: "/usuarios" }, { label: usuario.nome, href: `/usuarios/${usuario.id}` }, { label: "Editar" }]} />

      <EditEntityForm
        entity="usuario"
        entityName="Usuário"
        endpoint={`/api/usuarios/${usuario.id}`}
        redirectTo={`/usuarios/${usuario.id}`}
        icon={Users}
        method="PUT"
        data={{ ...usuario }}
        fields={[
          { name: "nome", label: "Nome", type: "text", required: true },
          { name: "email", label: "Email", type: "text", required: true },
          {
            name: "perfil",
            label: "Perfil",
            type: "select",
            required: true,
            options: [
              { value: "socio", label: "Sócio" },
              { value: "tecnico", label: "Técnico" },
              { value: "admin", label: "Administrador" },
            ],
          },
          { name: "cpf", label: "CPF", type: "text" },
          { name: "conselho", label: "Conselho (CREA/CRQ)", type: "text" },
          { name: "senha", label: "Nova senha (deixe em branco para manter)", type: "password" },
          { name: "ativo", label: "Ativo", type: "checkbox" },
        ]}
      />
    </div>
  );
}