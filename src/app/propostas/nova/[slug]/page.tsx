import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import PropostaServicoForm from "@/components/propostas/PropostaServicoForm";
import { getModeloProposta } from "@/lib/propostas/modelos";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const modelo = getModeloProposta(slug);
  return { title: modelo ? `Nova ${modelo.nome}` : "Nova Proposta" };
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await props.params;
  const modelo = getModeloProposta(slug);
  if (!modelo) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Nova", href: "/propostas/nova" },
          { label: modelo.nome },
        ]}
      />
      <PropostaServicoForm modeloSlug={modelo.slug} />
    </div>
  );
}
