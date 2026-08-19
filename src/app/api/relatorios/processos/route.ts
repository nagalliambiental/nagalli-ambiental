import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";
import { buildXlsx, xlsxResponse } from "@/lib/report-xlsx";

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado", em_andamento: "Em Andamento", exigencia_recebida: "Exigência Recebida",
  deferido: "Deferido", indeferido: "Indeferido", arquivado: "Arquivado",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const formato = searchParams.get("formato");

  const where: Prisma.ProcessoWhereInput = {};
  if (status) where.status = status;

  const processos = await prisma.processo.findMany({
    where,
    include: {
      orgao: { select: { sigla: true } },
      empreendimento: { select: { apelido: true, cliente: { select: { apelido: true } } } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const cols = [
    { header: "Protocolo", weight: 1.3 },
    { header: "Cliente", weight: 1.8 },
    { header: "Tipo", weight: 1.7 },
    { header: "Empreendimento", weight: 2.2 },
    { header: "Órgão", weight: 1 },
    { header: "Status", weight: 1.3 },
    { header: "Validade", weight: 1.2, align: "center" as const },
  ];

  const rows: NagalliCell[][] = processos.map((p) => [
    { text: p.numProtocolo || "—", bold: true },
    p.empreendimento.cliente.apelido || "—",
    p.tipo || "—",
    p.empreendimento.apelido || "—",
    p.orgao.sigla || "—",
    statusLabels[p.status] || p.status,
    { text: p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "—", align: "center" },
  ]);

  const porStatus = Object.entries(statusLabels)
    .map(([key, label]) => ({ key, label, count: processos.filter((p) => p.status === key).length }))
    .filter((s) => s.count > 0);

  const summary = [
    { label: "Total de processos", value: String(processos.length) },
    ...porStatus.map((s) => ({ label: s.label, value: String(s.count) })),
  ];

  if (formato === "xlsx") {
    return xlsxResponse(
      buildXlsx({ title: "Relatório de Processos Ambientais", subtitle: "Situação de cada processo por empreendimento.", cols, rows, summary }),
      "relatorio-processos"
    );
  }

  const { report } = await createNagalliReport({
    title: "Relatório de Processos Ambientais",
    subtitle: "Situação de cada processo por empreendimento: órgão, status e validade da licença.",
  });

  report.table(cols, rows, { cellSize: 8, headerSize: 9 });
  report.summary(summary);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-processos.pdf"`,
    },
  });
}
