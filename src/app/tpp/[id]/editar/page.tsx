import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Truck } from "lucide-react";
import TppForm from "@/components/TppForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar TPP" };

export default async function EditarTppPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const registro = await prisma.autorizacaoTpp.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      numero: true,
      clienteId: true,
      empreendimentoId: true,
      dataEmissao: true,
      dataValidade: true,
      veiculos: true,
      classesRisco: true,
      observacoes: true,
      arquivoNome: true,
    },
  });
  if (!registro) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "TPP", href: "/tpp" }, { label: registro.numero, href: `/tpp/${registro.id}` }, { label: "Editar" }]} />
      <Topbar
        icon={Truck}
        title={`Editar TPP ${registro.numero}`}
        subtitle={registro.arquivoNome || undefined}
      />
      <TppForm
        modo="editar"
        tppId={registro.id}
        inicial={{
          id: registro.id,
          numero: registro.numero,
          clienteId: registro.clienteId,
          empreendimentoId: registro.empreendimentoId,
          dataEmissao: registro.dataEmissao.toISOString(),
          dataValidade: registro.dataValidade.toISOString(),
          veiculos: registro.veiculos,
          classesRisco: registro.classesRisco,
          observacoes: registro.observacoes,
          arquivoNome: registro.arquivoNome,
        }}
      />
    </div>
  );
}