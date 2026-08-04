import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PropostasDemolicaoList from "./PropostasDemolicaoList";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propostas Demolição" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const propostas = await prisma.propostaDemolicao.findMany({
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    take: 20,
  });

  const propostasSerializadas = propostas.map((p) => ({ ...p, criadoEm: p.criadoEm.toISOString() }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Breadcrumbs
            items={[
              { label: "Propostas", href: "/propostas" },
              { label: "Demolição (PGRCC/RGRCC)" },
            ]}
          />
          <h1 className="text-2xl font-bold text-ink-900 mt-2">Propostas de Demolição</h1>
          <p className="text-ink-500">Lista das últimas propostas PGRCC/RGRCC para obras de demolição</p>
        </div>
        <Link
          href="/propostas/nova"
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition"
        >
          Nova Proposta
        </Link>
      </div>
      <PropostasDemolicaoList propostas={propostasSerializadas} />
    </div>
  );
}