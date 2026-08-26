import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Processo } from "@prisma/client";

export type CondicionanteLinha = {
  descricao: string;
};

const NUM_ITEM_RE = /^(?:\d{1,3}\.\s*|\d{1,3}\)\s*)/;
const PAGE_FOOTER_RE = /^p\u00e1gina\s+\d+\//i;
const BULLET_LETTER_RE = /^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa]\)\s*/i;
const EM_BRANCO_RE = /^\s*EM\s+BRANCO\s*$/i;
const FOOTER_TEXT_RE = /(?:Instituto\s+\u00c1gua\s+e\s+Terra|Rua\s+Engenheiros\s+Rebou[çc]as|Assinatura\s+do\s+Representante|LP\s+N[ºo]\s+\d+)/i;

export function parseCondicionantes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !PAGE_FOOTER_RE.test(l) && !EM_BRANCO_RE.test(l) && !FOOTER_TEXT_RE.test(l));

  const items: string[] = [];
  let current: string | null = null;

  const startsNew = (line: string): boolean =>
    NUM_ITEM_RE.test(line) || BULLET_LETTER_RE.test(line);

  for (const line of lines) {
    if (startsNew(line)) {
      if (current) items.push(current);
      current = line;
    } else if (current) {
      current = `${current} ${line}`;
    } else {
      current = line;
    }
  }
  if (current) items.push(current);

  const renumbered: string[] = [];
  const hasNumber = items.some((i) => NUM_ITEM_RE.test(i));
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
