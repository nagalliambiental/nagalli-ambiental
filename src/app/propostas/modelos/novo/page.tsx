import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Topbar } from "@/components/Topbar";
import PropostaModeloForm from "@/components/propostas/PropostaModeloForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo Modelo de Proposta" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) redirect("/");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Modelos de Proposta", href: "/propostas/modelos" },
          { label: "Novo" },
        ]}
      />
      <Topbar title="Novo Modelo de Proposta" subtitle="Cadastre um novo tipo de proposta a partir de um DOCX." />
      <div className="mx-auto max-w-4xl">
        <PropostaModeloForm />
      </div>
    </div>
  );
}
