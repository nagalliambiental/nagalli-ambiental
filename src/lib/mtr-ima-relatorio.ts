import { PDFDocument, StandardFonts } from "pdf-lib";
import { embedNagalliLogo, drawNagalliFooter, drawNagalliTopo, PALETTE } from "./report-branding";

export interface MtrImaRelatorioItem {
  numero: string;
  classeNome: string | null;
  dataExpedicao: Date | null;
  clienteNome: string | null;
  destinadorNome: string | null;
  quantidade: number | null;
  unidade: string | null;
}

const ORDEM = ["I", "II A", "II B", "Não identificada"];

export async function gerarPdfMtrsImaPorClasse(
  conexaoNome: string,
  itens: MtrImaRelatorioItem[],
  periodo: { inicio: Date; fim: Date },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedNagalliLogo(pdf);
  const grupos = new Map<string, MtrImaRelatorioItem[]>();
  for (const classe of ORDEM) grupos.set(classe, []);
  for (const item of itens) grupos.get(item.classeNome || "Não identificada")?.push(item);

  let page = pdf.addPage([842, 595]);
  let y = drawNagalliTopo(page, logo, font, bold) - 24;
  const novaPagina = () => {
    page = pdf.addPage([842, 595]);
    return drawNagalliTopo(page, logo, font, bold) - 24;
  };
  const fmt = (d: Date | null) => d?.toLocaleDateString("pt-BR") || "—";

  page.drawText("RELATÓRIO DE MTRs-IMA POR CLASSE", { x: 40, y, size: 15, font: bold, color: PALETTE.ink["900"] });
  y -= 16;
  page.drawText(`Conexão: ${conexaoNome} | Período: ${fmt(periodo.inicio)} a ${fmt(periodo.fim)} | Total: ${itens.length}`, { x: 40, y, size: 9, font, color: PALETTE.ink["500"] });
  y -= 28;

  for (const classe of ORDEM) {
    const lista = grupos.get(classe)!;
    if (y < 90) y = novaPagina();
    page.drawRectangle({ x: 40, y: y - 4, width: 762, height: 20, color: PALETTE.brand["600"] });
    page.drawText(`CLASSE ${classe} — ${lista.length} MTR(s)`, { x: 48, y: y + 2, size: 11.5, font: bold, color: PALETTE.paper["50"] });
    y -= 30;
    if (lista.length === 0) {
      page.drawText("Nenhum MTR nesta classe.", { x: 56, y, size: 9, font, color: PALETTE.ink["700"] });
      y -= 22;
      continue;
    }
    for (const item of lista) {
      if (y < 70) y = novaPagina();
      page.drawText(`MTR ${item.numero}`, { x: 56, y, size: 9.5, font: bold, color: PALETTE.ink["900"] });
      const detalhes = [fmt(item.dataExpedicao), item.clienteNome || "gerador não informado", item.destinadorNome || "destinador não informado"];
      if (item.quantidade != null) detalhes.push(`${item.quantidade.toLocaleString("pt-BR")} ${item.unidade || ""}`.trim());
      page.drawText(detalhes.join(" | ").slice(0, 125), { x: 150, y, size: 8.5, font, color: PALETTE.ink["700"] });
      y -= 17;
    }
    y -= 10;
  }
  drawNagalliFooter(page, font, bold);
  return new Uint8Array(await pdf.save());
}
