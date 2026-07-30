import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrazosView } from "@/components/PrazosView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prazos" };

export default async function PrazosPage() {
  const [exigencias, processosComValidade] = await Promise.all([
    prisma.exigencia.findMany({
      where: { cumprida: false },
      include: {
        processo: {
          select: {
            id: true,
            numProtocolo: true,
            tipo: true,
            orgao: { select: { sigla: true } },
            empreendimento: {
              select: { apelido: true, cliente: { select: { apelido: true } } },
            },
          },
        },
      },
      orderBy: { prazo: "asc" },
    }),
    prisma.processo.findMany({
      where: { validade: { not: null } },
      include: {
        orgao: { select: { sigla: true } },
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { validade: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Prazos" }]} />
      <Topbar title="Prazos" subtitle="Acompanhe os prazos de processos e exigências" />
      <PrazosView
        processos={processosComValidade.map((p) => ({
          id: p.id,
          numProtocolo: p.numProtocolo,
          validade: p.validade!.toISOString(),
          alertaDias: p.alertaDias,
          orgao: p.orgao,
          empreendimento: p.empreendimento,
        }))}
        exigencias={exigencias.map((e) => ({
          id: e.id,
          descricao: e.descricao,
          prazo: e.prazo.toISOString(),
          processo: {
            id: e.processo.id,
            numProtocolo: e.processo.numProtocolo,
            orgao: e.processo.orgao,
            empreendimento: e.processo.empreendimento,
          },
        }))}
      />
    </div>
  );
}
