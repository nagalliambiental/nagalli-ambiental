import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export interface EmbargosDados {
  razao_social: string;
  cnpj: string;
  endereco: string;
  tipo_licenca: string;
  municipio_data: string;
  dia: string;
  mes: string;
  ano: string;
}

export function embargosVazios(): EmbargosDados {
  return {
    razao_social: "",
    cnpj: "",
    endereco: "",
    tipo_licenca: "",
    municipio_data: "",
    dia: "",
    mes: "",
    ano: "",
  };
}

export function renderEmbargosDocx(data: EmbargosDados): Buffer {
  const templatePath = path.join(
    process.cwd(),
    "src/lib/templates/embargos/template.docx"
  );
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render({ ...embargosVazios(), ...data });
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
