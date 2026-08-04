import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getModelosProposta } from "@/lib/propostas/modelos";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova Proposta" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const modelos = getModelosProposta();

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
        {modelos.map((modelo) => (
          <Link
            key={modelo.slug}
            href={`/propostas/nova/${modelo.slug}`}
            className="group rounded-[var(--radius-card)] border border-paper-200 bg-white p-6 shadow-card transition hover:border-brand-500 hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{modelo.nome}</h2>
                <p className="mt-1 text-sm text-ink-500">{modelo.descricao}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
