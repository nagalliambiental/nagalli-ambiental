import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";

const statusLabels: Record<string, string> = {
  pendente: "Pendente", pago: "Pago", atrasado: "Atrasado", cancelado: "Cancelado",
};

const statusColor: Record<string, string> = {
  pendente: "#B45309",
  pago: "#446B2C",
  atrasado: "#B91C1C",
  cancelado: "#6B7362",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const clienteId = searchParams.get("clienteId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where: Prisma.FinanceiroWhereInput = {};
  if (status) where.statusPagamento = status;
  if (clienteId) where.clienteId = Number(clienteId);
  if (dataInicio || dataFim) {
    where.dataVencimento = {};
    if (dataInicio) where.dataVencimento.gte = new Date(dataInicio);
    if (dataFim) where.dataVencimento.lte = new Date(dataFim);
  }

  const registros = await prisma.financeiro.findMany({
    where,
    include: { cliente: { select: { apelido: true } } },
    orderBy: [{ cliente: { apelido: "asc" } }, { dataVencimento: "asc" }],
  });

  const totalGeral = registros.reduce((s, r) => s + r.valor, 0);
  const pendentes = registros.filter((r) => r.statusPagamento === "pendente" || r.statusPagamento === "atrasado");
  const totalPendente = pendentes.reduce((s, r) => s + r.valor, 0);

  const filtros = [
    status ? `Status: ${statusLabels[status] || status}` : "",
    clienteId ? `Cliente ID: ${clienteId}` : "",
    dataInicio ? `Vencimento a partir de ${new Date(dataInicio).toLocaleDateString("pt-BR")}` : "",
    dataFim ? `até ${new Date(dataFim).toLocaleDateString("pt-BR")}` : "",
  ].filter(Boolean).join(" · ");

  const { report } = await createNagalliReport({
    title: "Relatório Financeiro",
    subtitle: filtros
      ? `Cobranças e recebimentos — ${filtros}.`
      : "Cobranças e recebimentos: valores, vencimentos e situação de pagamento.",
  });

  const cols = [
    { header: "Cliente", weight: 1.6 },
    { header: "Descrição", weight: 2.2 },
    { header: "Tipo", weight: 1.1 },
    { header: "Valor", weight: 1.1, align: "right" as const },
    { header: "Status", weight: 1.2 },
    { header: "Vencimento", weight: 1.1, align: "center" as const },
    { header: "Pagamento", weight: 1.1, align: "center" as const },
  ];

  const rows: NagalliCell[][] = registros.map((r) => [
    { text: r.cliente.apelido || "—", bold: true },
    r.descricao || "—",
    r.tipoCobranca || "—",
    { text: r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), align: "right" },
    { text: statusLabels[r.statusPagamento] || r.statusPagamento, bold: true, color: statusColor[r.statusPagamento] },
    { text: r.dataVencimento ? new Date(r.dataVencimento).toLocaleDateString("pt-BR") : "—", align: "center" },
    { text: r.dataPagamento ? new Date(r.dataPagamento).toLocaleDateString("pt-BR") : "—", align: "center" },
  ]);

  report.table(cols, rows, { cellSize: 8, headerSize: 8 });

  report.summary([
    { label: "Total de registros", value: String(registros.length) },
    { label: "Total geral", value: totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
    { label: "Em aberto (pendente/atrasado)", value: totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
  ]);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-financeiro.pdf"`,
    },
  });
}
