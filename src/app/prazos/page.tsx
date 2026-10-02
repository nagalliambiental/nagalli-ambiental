import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrazosView } from "@/components/PrazosView";
import { CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prazos" };

export default async function PrazosPage() {
  const [exigencias, processosComValidade, pgrsComValidade] = await Promise.all([
    prisma.exigencia.findMany({
      where: { cumprida: false },
      include: {
        processo: {
          select: {
            id: true,
            numProtocolo: true,
            numLicenca: true,
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
        numLicenca: true,
        tipo: true,
        validade: true,
        alertaDias: true,
        orgao: { select: { sigla: true } },
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { validade: "asc" },
    }),
    prisma.pgrs.findMany({
      where: { ativo: true, validade: { not: null } },
      select: {
        id: true,
        numero: true,
        validade: true,
        alertaDias: true,
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { validade: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Prazos" }]} />
      <Topbar icon={CalendarClock} title="Prazos" subtitle="Acompanhe os prazos de licenças, exigências e PGRS" />
      <PrazosView
        processos={processosComValidade.map((p) => ({
          id: p.id,
          numProtocolo: p.numProtocolo,
          numLicenca: p.numLicenca,
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
            numLicenca: e.processo.numLicenca,
            tipo: e.processo.tipo,
            orgao: e.processo.orgao,
            empreendimento: e.processo.empreendimento,
          },
        }))}
        pgrs={pgrsComValidade.map((p) => ({
          id: p.id,
          numero: p.numero,
          validade: p.validade!.toISOString(),
          alertaDias: p.alertaDias,
          empreendimento: p.empreendimento,
        }))}
      />
    </div>
  );
}
