import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Processo } from "@prisma/client";

export const CHECKBOX_VAZIO = `<w:sym w:font="Wingdings" w:char="F0A8"/>`;
export const CHECKBOX_MARCADO = `<w:sym w:font="Wingdings" w:char="F0A9"/>`;

export type CondicionanteLinha = {
  descricao: string;
  checkbox: string;
};

export function parseCondicionantes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function buildCondicionantesData(
  processo: Pick<Processo, "numLicenca" | "tipo">,
  empresa: { razaoSocial?: string | null },
  dataEmissao: string,
  condicionantes: string[] = parseCondicionantes((processo as { condicionantes?: string | null }).condicionantes)
): Record<string, unknown> {
  return {
    num_licenca: processo.numLicenca || "",
    tipo: processo.tipo || "",
    data_emissao: dataEmissao,
    empresa: empresa.razaoSocial || "",
    condicionantes: condicionantes.map((descricao) => ({
      descricao,
      checkbox: CHECKBOX_VAZIO,
    })),
  };
}

export function renderCondicionantesDocx(data: Record<string, unknown>): Buffer {
  const templatePath = path.join(
    process.cwd(),
    "src/lib/templates/relatorio-condicionantes/template.docx"
  );
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
