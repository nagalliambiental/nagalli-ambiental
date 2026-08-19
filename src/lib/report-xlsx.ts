import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import type { NagalliCell, NagalliCol } from "./report-layout";

function cellText(cell: NagalliCell): string {
  return typeof cell === "string" ? cell : cell.text;
}

export interface XlsxReportOptions {
  title: string;
  subtitle?: string;
  cols: NagalliCol[];
  rows: NagalliCell[][];
  summary?: { label: string; value: string }[];
  sheetName?: string;
}

export function buildXlsx(opts: XlsxReportOptions): Buffer {
  const aoa: (string | number)[][] = [];
  aoa.push([opts.title]);
  if (opts.subtitle) aoa.push([opts.subtitle]);
  if (opts.summary && opts.summary.length) {
    aoa.push([]);
    for (const item of opts.summary) {
      aoa.push([item.label, item.value]);
    }
  }
  aoa.push([]);
  aoa.push(opts.cols.map((c) => c.header));
  for (const row of opts.rows) {
    aoa.push(row.map(cellText));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = opts.cols.map((c) => ({ wch: Math.min(60, Math.max(12, (c.header.length + 2) * 1.6)) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (opts.sheetName || "Relatório").slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function xlsxResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}