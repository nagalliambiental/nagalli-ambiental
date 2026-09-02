import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrazosView } from "@/components/PrazosView";
import { CalendarClock } from "lucide-react";

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
      where: { validade: { not: null }, renovacaoPendente: false },
      select: {
        id: true,
        numProtocolo: true,
        tipo: true,
        validade: true,
        alertaDias: true,
        orgao: { select: { sigla: true } },
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { validade: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Prazos" }]} />
      <Topbar icon={CalendarClock} title="Prazos" subtitle="Acompanhe os prazos de licenças e exigências" />
      <PrazosView
        processos={processosComValidade.map((p) => ({
          id: p.id,
          numProtocolo: p.numProtocolo,
          tipo: p.tipo,
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
            tipo: e.processo.tipo,
            orgao: e.processo.orgao,
            empreendimento: e.processo.empreendimento,
          },
        }))}
      />
    </div>
  );
}
