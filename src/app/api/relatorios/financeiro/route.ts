import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const margin = 40;
  const colWidths = [100, 130, 70, 70, 70, 90, 90];
  let y = height - margin;

  function drawHeader(text: string, x: number) {
    page.drawText(text, { x, y, size: 8, font: bold, color: rgb(1, 1, 1) });
  }

  function drawCell(text: string, x: number, w: number) {
    page.drawText(text.slice(0, Math.floor(w / 4.5)), { x, y, size: 8, font, color: rgb(0.15, 0.15, 0.15) });
  }

  page.drawText("Relatório Financeiro", { x: margin, y, size: 18, font: bold });
  y -= 20;
  const filtros = [status ? `Status: ${status}` : "", clienteId ? `Cliente ID: ${clienteId}` : "", dataInicio ? `De: ${dataInicio}` : "", dataFim ? `Até: ${dataFim}` : ""].filter(Boolean).join(" | ");
  if (filtros) { page.drawText(filtros, { x: margin, y, size: 10, font }); y -= 14; }
  page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: margin, y, size: 9, font });
  y -= 24;

  page.drawRectangle({ x: margin, y: y - 12, width: width - 80, height: 14, color: rgb(0.2, 0.2, 0.2) });

  const headers = ["Cliente", "Descrição", "Tipo", "Valor", "Status", "Vencimento", "Pagamento"];
  let x = margin + 4;
  for (let i = 0; i < headers.length; i++) {
    drawHeader(headers[i], x);
    x += colWidths[i];
  }
  y -= 14;

  let row = 0;
  for (const r of registros) {
    if (y < 50) {
      page = pdf.addPage([842, 595]);
      y = height - margin;
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: margin, y: y - 12, width: width - 80, height: 14, color: rgb(0.95, 0.95, 0.95) });
    }

    x = margin + 4;
    drawCell(r.cliente.apelido, x, colWidths[0]); x += colWidths[0];
    drawCell(r.descricao || "—", x, colWidths[1]); x += colWidths[1];
    drawCell(r.tipoCobranca, x, colWidths[2]); x += colWidths[2];
    drawCell(r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), x, colWidths[3]); x += colWidths[3];

    const statusLabels: Record<string, string> = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado", cancelado: "Cancelado" };
    drawCell(statusLabels[r.statusPagamento] || r.statusPagamento, x, colWidths[4]); x += colWidths[4];
    drawCell(r.dataVencimento ? new Date(r.dataVencimento).toLocaleDateString("pt-BR") : "—", x, colWidths[5]); x += colWidths[5];
    drawCell(r.dataPagamento ? new Date(r.dataPagamento).toLocaleDateString("pt-BR") : "—", x, colWidths[6]);

    y -= 14;
    row++;
  }

  y -= 20;
  page.drawText(`Total de registros: ${registros.length}`, { x: margin, y, size: 10, font: bold }); y -= 13;
  page.drawText(`Total geral: ${totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, { x: margin, y, size: 10, font: bold }); y -= 13;
  page.drawText(`Total pendente: ${totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, { x: margin, y, size: 10, font: bold });

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-financeiro.pdf"`,
    },
  });
}
