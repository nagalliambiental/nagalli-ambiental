import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Processo } from "@prisma/client";

export const ATENDIMENTO_DROPDOWN_XML = `<w:sdt><w:sdtPr><w:dropDownList><w:listItem w:displayText="Selecione..." w:value=""/><w:listItem w:displayText="Atendida" w:value="Atendida"/><w:listItem w:displayText="Não atendida" w:value="Não atendida"/></w:dropDownList></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Selecione...</w:t></w:r></w:sdtContent></w:sdt>`;

export type CondicionanteLinha = {
  descricao: string;
  atendimento: string;
};

const NUM_ITEM_RE = /^(?:\d{1,3}\.\s*|\d{1,3}\)\s*|\-\s*|•\s*|\*\s*)/;
const PAGE_FOOTER_RE = /^página\s+\d+\//i;
const BULLET_LETTER_RE = /^[a-záéíóú]\)\s*/i;

export function parseCondicionantes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !PAGE_FOOTER_RE.test(l));

  const items: string[] = [];
  let current: string | null = null;

  const startsNew = (line: string): boolean =>
    NUM_ITEM_RE.test(line) || BULLET_LETTER_RE.test(line);

  for (const line of lines) {
    if (startsNew(line)) {
      if (current) items.push(current);
      current = line;
    } else if (current) {
      // continua no item anterior (evita quebras de linha e espaços duplicados)
      const compact = line.replace(/^[-\u2022*]\s*/, "");
      current = `${current} ${compact}`;
    } else {
      current = line;
    }
  }
  if (current) items.push(current);

  // garante numeração sequencial (1., 2., ...) em itens que ainda não têm
  const renumbered: string[] = [];
  let hasNumber = items.some((i) => NUM_ITEM_RE.test(i));
  items.forEach((item, i) => {
    if (hasNumber && NUM_ITEM_RE.test(item)) {
      renumbered.push(item);
    } else if (hasNumber) {
      renumbered.push(item);
    } else {
      renumbered.push(`${i + 1}. ${item}`);
    }
  });

  if (renumbered.length === 0) return lines;
  return renumbered;
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
    condicionantes: condicionantes.map((descricao) => ({ descricao })),
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
