import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";
import { buildXlsx, xlsxResponse } from "@/lib/report-xlsx";
import { formatDate } from "@/lib/format";
import { STATUS_TAREFA } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

const ROTULO_STATUS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  para_revisao: "Para revisão",
  concluida: "Concluída",
};

const ROTULO_PRIORIDADE: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function diasAte(data: Date): number {
  return Math.ceil((data.getTime() - Date.now()) / 86400000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q")?.trim() ?? undefined;
  const responsavelId = searchParams.get("responsavelId") ?? undefined;

  const where: Prisma.TarefaWhereInput = { ativo: true };
  if (status) where.status = status;
  if (responsavelId) where.responsavelId = Number(responsavelId);
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { descricao: { contains: q, mode: "insensitive" } },
      { observacoes: { contains: q, mode: "insensitive" } },
    ];
  }

  const tarefas = await prisma.tarefa.findMany({
    where,
    include: {
      responsavel: { select: { nome: true } },
      empreendimento: { select: { apelido: true } },
      processo: { select: { numProtocolo: true, numLicenca: true } },
      _count: { select: { anexos: true } },
    },
    orderBy: [{ prazoFinal: { sort: "asc", nulls: "last" } }, { criadoEm: "desc" }],
    take: 2000,
  });

  const cols = [
    { header: "Título", weight: 2.4 },
    { header: "Status", weight: 1.2, align: "center" as const },
    { header: "Prioridade", weight: 1.0, align: "center" as const },
    { header: "Responsável", weight: 1.5 },
      { header: "Licença", weight: 1.4 },
    { header: "Prazo Final", weight: 1.2, align: "center" as const },
    { header: "Situação", weight: 1.2, align: "center" as const },
  ];

  const rows: NagalliCell[][] = tarefas.map((t) => {
    const concluida = t.status === STATUS_TAREFA.CONCLUIDA;
    const dias = t.prazoFinal ? diasAte(t.prazoFinal) : null;
    const situacao = concluida
      ? "Concluída"
      : dias === null
        ? "Sem prazo"
        : dias < 0
          ? "Atrasada"
          : dias <= t.alertaPrazoFinal
            ? `Vence em ${dias}d`
            : "No prazo";

    return [
      { text: t.titulo, bold: true },
      ROTULO_STATUS[t.status] ?? t.status,
      ROTULO_PRIORIDADE[t.prioridade] ?? t.prioridade,
      t.responsavel.nome,
      t.processo?.numLicenca || t.processo?.numProtocolo || "—",
      { text: t.prazoFinal ? formatDate(t.prazoFinal) : "—", align: "center" },
      { text: situacao, align: "center", bold: situacao === "Atrasada" },
    ];
  });

  const emAberto = tarefas.filter((t) => t.status !== STATUS_TAREFA.CONCLUIDA).length;
  const concluidas = tarefas.length - emAberto;
  const atrasadas = tarefas.filter(
    (t) => t.status !== STATUS_TAREFA.CONCLUIDA && t.prazoFinal && diasAte(t.prazoFinal) < 0
  ).length;

  const filtros: string[] = [];
  if (status) filtros.push(`Status: ${ROTULO_STATUS[status] ?? status}`);
  if (q) filtros.push(`Busca: "${q}"`);

  const summary = [
    { label: "Total de tarefas", value: String(tarefas.length) },
    { label: "Em aberto", value: String(emAberto) },
    ...(concluidas > 0 ? [{ label: "Concluídas", value: String(concluidas) }] : []),
    ...(atrasadas > 0 ? [{ label: "Atrasadas", value: String(atrasadas) }] : []),
  ];

  if (formato === "xlsx") {
    return xlsxResponse(
      buildXlsx({
        title: "Relatório de Tarefas",
        subtitle: filtros.length ? filtros.join(" · ") : "Tarefas cadastradas com status, responsáveis e prazos.",
        cols,
        rows,
        summary,
      }),
      "relatorio-tarefas"
    );
  }

  const { report } = await createNagalliReport({
    title: "Relatório de Tarefas",
    subtitle: filtros.length ? filtros.join(" · ") : "Tarefas cadastradas com status, responsáveis e prazos.",
  });

  report.table(cols, rows, { cellSize: 8, headerSize: 9 });
  report.summary(summary);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-tarefas.pdf"`,
    },
  });
}
