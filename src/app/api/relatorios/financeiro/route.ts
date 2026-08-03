import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { embedBrandLogos, drawBrandHeader, drawBrandFooter } from "@/lib/pdf-branding";

function wrapLines(text: string, f: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && f.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

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
  const logos = await embedBrandLogos(pdf);

  let page = pdf.addPage([842, 595]);
  drawBrandFooter(page, font, 842);
  const { width, height } = page.getSize();
  const marginX = 40;
  const marginTop = 92;
  const colWidths = [100, 130, 70, 70, 70, 90, 90];
  const cellSize = 8;
  let y = height - marginTop;

  function wrapCell(text: string, w: number): string[] {
    return wrapLines(text, font, cellSize, w - 6);
  }

  function drawCell(text: string, x: number, lines: string[]) {
    let ly = y;
    for (const ln of lines) {
      page.drawText(ln, { x, y: ly, size: cellSize, font, color: rgb(0.15, 0.15, 0.15) });
      ly -= cellSize + 2;
    }
    void text;
  }

  const headers = ["Cliente", "Descrição", "Tipo", "Valor", "Status", "Vencimento", "Pagamento"];
  const filtros = [status ? `Status: ${status}` : "", clienteId ? `Cliente ID: ${clienteId}` : "", dataInicio ? `De: ${dataInicio}` : "", dataFim ? `Até: ${dataFim}` : ""].filter(Boolean).join(" | ");

  function drawPageHeader() {
    drawBrandHeader(page, logos, marginX, height - 20);
    page.drawText("Relatório Financeiro", { x: marginX, y, size: 18, font: bold });
    y -= 20;
    if (filtros) { page.drawText(filtros, { x: marginX, y, size: 10, font }); y -= 14; }
    page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: marginX, y, size: 9, font });
    y -= 24;

    page.drawRectangle({ x: marginX, y: y - 14, width: width - 80, height: 16, color: rgb(0.2, 0.2, 0.2) });

    let x = marginX + 4;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x, y: y - 10, size: 8, font: bold, color: rgb(1, 1, 1) });
      x += colWidths[i];
    }
    y -= 24;
  }

  drawPageHeader();

  let row = 0;
  for (const r of registros) {
    const statusLabels: Record<string, string> = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado", cancelado: "Cancelado" };
    const cells: string[] = [
      r.cliente.apelido || "",
      r.descricao || "—",
      r.tipoCobranca || "",
      r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      statusLabels[r.statusPagamento] || r.statusPagamento,
      r.dataVencimento ? new Date(r.dataVencimento).toLocaleDateString("pt-BR") : "—",
      r.dataPagamento ? new Date(r.dataPagamento).toLocaleDateString("pt-BR") : "—",
    ];
    const wrapped = cells.map((text, i) => wrapCell(text, colWidths[i]));
    const linesCount = Math.max(...wrapped.map((l) => l.length));
    const rowHeight = linesCount * (cellSize + 2) + 4;

    if (y - rowHeight < 50) {
      page = pdf.addPage([842, 595]);
      drawBrandFooter(page, font, width);
      y = height - marginTop;
      drawPageHeader();
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: marginX, y: y - rowHeight + 4, width: width - 80, height: rowHeight, color: rgb(0.95, 0.95, 0.95) });
    }

    let x = marginX + 4;
    for (let i = 0; i < cells.length; i++) {
      drawCell(cells[i], x, wrapped[i]);
      x += colWidths[i];
    }

    y -= rowHeight;
    row++;
  }

  y -= 20;
  if (y < 50) {
    page = pdf.addPage([842, 595]);
    drawBrandFooter(page, font, width);
    y = height - marginTop;
  }
  page.drawText(`Total de registros: ${registros.length}`, { x: marginX, y, size: 10, font: bold }); y -= 13;
  page.drawText(`Total geral: ${totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, { x: marginX, y, size: 10, font: bold }); y -= 13;
  page.drawText(`Total pendente: ${totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, { x: marginX, y, size: 10, font: bold });

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-financeiro.pdf"`,
    },
  });
}
