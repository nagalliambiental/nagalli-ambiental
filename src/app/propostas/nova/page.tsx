import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FileText, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova Proposta" };

const TIPOS = [
  {
    slug: "comercial",
    titulo: "Proposta Comercial",
    descricao:
      "Proposta de serviço genérica vinculada a cliente e empreendimento cadastrados, com valor e validade.",
    href: "/propostas/nova/comercial",
    icon: FileText,
  },
  {
    slug: "demolicao",
    titulo: "PGRCC e RGRCC (Demolição)",
    descricao:
      "Proposta para obras de demolição com elaboração de PGRCC e RGRCC, numeração sequencial e controle de revisões.",
    href: "/propostas/demolicao/nova",
    icon: Wrench,
  },
] as const;

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Nova", href: "/propostas/nova" },
          { label: "Tipo de serviço" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Nova Proposta</h1>
        <p className="text-ink-500">Selecione o tipo de serviço para continuar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TIPOS.map((tipo) => {
          const Icon = tipo.icon;
          return (
            <Link
              key={tipo.slug}
              href={tipo.href}
              className="group rounded-[var(--radius-card)] border border-paper-200 bg-white p-6 shadow-card transition hover:border-brand-500 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                  <Icon size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">{tipo.titulo}</h2>
                  <p className="mt-1 text-sm text-ink-500">{tipo.descricao}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
