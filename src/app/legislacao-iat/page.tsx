import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Scale } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Topbar } from "@/components/Topbar";
import { FONTE_LEGISLACAO_IAT } from "@/lib/legislacao-iat";
import {
  LegislacaoIatPainel,
  type LegislacaoIatLinha,
} from "@/components/legislacao-iat/LegislacaoIatPainel";
import { LegislacaoIatSincronizar } from "@/components/legislacao-iat/LegislacaoIatSincronizar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Legislação IAT" };

export default async function LegislacaoIatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const registros = await prisma.legislacaoIat.findMany({
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    select: {
      id: true,
      tipo: true,
      numero: true,
      ano: true,
      titulo: true,
      ementa: true,
      url: true,
      anexosUrl: true,
      situacao: true,
      revogadaPor: true,
      dataAto: true,
      dataPublicacao: true,
      ultimaVerificacao: true,
    },
  });

  const ultimaVerificacao = registros[0]?.ultimaVerificacao.toISOString() ?? null;

  const itens: LegislacaoIatLinha[] = registros.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    numero: r.numero,
    ano: r.ano,
    titulo: r.titulo,
    ementa: r.ementa,
    url: r.url,
    anexosUrl: r.anexosUrl,
    situacao: r.situacao,
    revogadaPor: r.revogadaPor,
    dataAto: r.dataAto ? r.dataAto.toISOString() : null,
    dataPublicacao: r.dataPublicacao,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Legislação IAT" }]} />
      <Topbar
        icon={Scale}
        title="Legislação IAT"
        subtitle="Instruções Normativas e Orientações Técnicas do Instituto Água e Terra (IAT)."
        actions={<LegislacaoIatSincronizar />}
      />

      {itens.length === 0 ? (
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-ink-500)]">
            Base de normas ainda vazia. Clique em <strong>Sincronizar agora</strong> para importar as
            Instruções Normativas e Orientações Técnicas do site do IAT.
          </p>
          <p className="mt-3 text-xs text-[var(--color-ink-400)]">Fonte: {FONTE_LEGISLACAO_IAT}</p>
        </div>
      ) : (
        <LegislacaoIatPainel itens={itens} fonteUrl={FONTE_LEGISLACAO_IAT} ultimaVerificacao={ultimaVerificacao} />
      )}
    </div>
  );
}
