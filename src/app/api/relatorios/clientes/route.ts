import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    include: { _count: { select: { empreendimentos: true } } },
    orderBy: { apelido: "asc" },
  });

  const { report } = await createNagalliReport({
    title: "Relatório de Clientes",
    subtitle: "Cadastro completo de clientes com dados de contato e quantidade de empreendimentos.",
  });

  const cols = [
    { header: "Apelido", weight: 1.3 },
    { header: "Razão Social", weight: 2 },
    { header: "CNPJ", weight: 1.6 },
    { header: "Telefone", weight: 1.2 },
    { header: "Empreendimentos", weight: 1, align: "center" as const },
  ];

  const rows: NagalliCell[][] = clientes.map((c) => [
    { text: c.apelido || "—", bold: true },
    c.razaoSocial || "—",
    c.cnpj || "—",
    c.telefone || "—",
    { text: String(c._count.empreendimentos), align: "center" },
  ]);

  report.table(cols, rows, { cellSize: 8, headerSize: 9 });

  const totalEmpreendimentos = clientes.reduce((s, c) => s + c._count.empreendimentos, 0);
  report.summary([
    { label: "Total de clientes", value: String(clientes.length) },
    { label: "Empreendimentos vinculados", value: String(totalEmpreendimentos) },
  ]);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-clientes.pdf"`,
    },
  });
}
