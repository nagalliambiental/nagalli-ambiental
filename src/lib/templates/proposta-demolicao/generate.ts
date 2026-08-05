import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { PropostaDemolicaoFormData, PropostaDemolicaoDocxData, buildDocxData } from "./config";

export function renderPropostaDemolicaoDocx(data: PropostaDemolicaoDocxData): Buffer {
  const templatePath = path.join(
    process.cwd(),
    "src/lib/templates/proposta-demolicao/template.docx"
  );
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const itens = [
    {
      item: 1,
      descricao: "Elaboração de PGRCC para obra de demolição.",
      st: "n",
      da: "HT",
      percentual: "18%",
      valorUnit: data.valorTotalPgrccFormatado,
      valorComDesconto: "",
    },
    {
      item: 2,
      descricao: "Elaboração de RGRCC para obra de demolição.",
      st: "y",
      da: "HT",
      percentual: "18%",
      valorUnit: data.valorTotalRgrccFormatado,
      valorComDesconto: "",
    },
    {
      item: 3,
      descricao: "Anotação de Responsabilidade Técnica CREA-PR",
      st: "inclusa",
      da: "",
      percentual: "",
      valorUnit: "incluso",
      valorComDesconto: "",
    },
  ];

  doc.render({
    ...data,
    itens,
  });

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

export function gerarPropostaDemolicao(
  form: PropostaDemolicaoFormData,
  meta: { numero: number; ano: number; revisao: number }
): Buffer {
  const docxData = buildDocxData(form, meta);
  return renderPropostaDemolicaoDocx(docxData);
}