import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrazosView } from "@/components/PrazosView";
import { CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prazos" };

export default async function PrazosPage() {
  const [exigencias, processosComValidade, pgrsComValidade, tppsComValidade] = await Promise.all([
    prisma.exigencia.findMany({
      where: {
        cumprida: false,
        processo: { renovacaoPendente: false, status: { not: "em_renovacao" } },
      },
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
      where: { validade: { not: null }, renovacaoPendente: false, status: { not: "em_renovacao" } },
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
    prisma.autorizacaoTpp.findMany({
      where: { ativo: true },
      select: {
        id: true,
        numero: true,
        dataValidade: true,
        cliente: { select: { apelido: true } },
        empreendimento: { select: { apelido: true } },
      },
      orderBy: { dataValidade: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Prazos" }]} />
      <Topbar icon={CalendarClock} title="Prazos" subtitle="Acompanhe os prazos de licenças, exigências, PGRS e TPP" />
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
        tpps={tppsComValidade.map((t) => ({
          id: t.id,
          numero: t.numero,
          validade: t.dataValidade.toISOString(),
          clienteApelido: t.cliente.apelido,
          empreendimentoApelido: t.empreendimento?.apelido ?? null,
        }))}
      />
    </div>
  );
}
