import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const TIMBRADO_PATH = "C:/Users/Tecnico3/Downloads/Logo Nagalli Ambiental/timbrado.docx";
const OUTPUT_PATH = path.join(process.cwd(), "src/lib/templates/relatorio-condicionantes/template.docx");

function makeTitle() {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:b/><w:bCs/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:b/><w:bCs/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">RELATÓRIO DE ATENDIMENTO A CONDICIONANTES</w:t></w:r></w:p>`;
}

function makeLicenseLine() {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">{tipo} Nº {num_licenca}</w:t></w:r></w:p>`;
}

function makeIntro() {
  return `<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">Estão previstos como Detalhamento dos Requisitos de Licenciamento:</w:t></w:r></w:p>`;
}

function makeTable() {
  const fontTag = `<w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/>`;
  const sz20 = `<w:sz w:val="20"/><w:szCs w:val="20"/>`;
  const boldTag = `<w:b/><w:bCs/>`;

  function tc(width: string, content: string, jc = "both") {
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="${jc}"/></w:pPr>${content}</w:p></w:tc>`;
  }

  function headerCell(text: string) {
    return `<w:r><w:rPr>${fontTag}${boldTag}${sz20}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
  }

  function descRun() {
    return `<w:r><w:rPr>${fontTag}${sz20}</w:rPr><w:t xml:space="preserve">{descricao}</w:t></w:r>`;
  }

  function atendRun() {
    return `<w:r><w:rPr>${fontTag}${sz20}</w:rPr><w:t xml:space="preserve">Item dispositivo/orientativo. Requisito atendido.</w:t></w:r>`;
  }

  const col1 = "6587";
  const col2 = "2196";

  const headerRow = `<w:tr>${tc(col1, headerCell("Requisito"))}${tc(col2, headerCell("Atendimento"))}</w:tr>`;

  // docxtemplater table row loop: {#} in first <w:tc>, {/} in last <w:tc>
  const dataRow = `<w:tr>${tc(col1, `<w:r><w:rPr>${fontTag}${sz20}</w:rPr><w:t xml:space="preserve">{#condicionantes}</w:t></w:r>${descRun()}`, "left")}${tc(col2, `${atendRun()}<w:r><w:rPr>${fontTag}${sz20}</w:rPr><w:t xml:space="preserve">{/condicionantes}</w:t></w:r>`, "center")}</w:tr>`;

  return `<w:tbl><w:tblPr><w:tblStyle w:val="Tabelacomgrade"/><w:tblW w:w="8783" w:type="dxa"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="${col1}"/><w:gridCol w:w="${col2}"/></w:tblGrid>${headerRow}${dataRow}</w:tbl>`;
}

function makeDateLine() {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:noProof/></w:rPr><w:t xml:space="preserve">{data_emissao}</w:t></w:r></w:p>`;
}

function makeCompanyLine() {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Ebrima" w:hAnsi="Ebrima"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">{empresa}</w:t></w:r></w:p>`;
}

async function main() {
  const buf = fs.readFileSync(TIMBRADO_PATH);
  const zip = new PizZip(buf);

  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("word/document.xml not found in timbrado.docx");
  const docXml = docFile.asText();

  // Find body and sectPr
  const bodyOpenEnd = docXml.indexOf("<w:body>") + 8;
  const sectPrStart = docXml.indexOf("<w:sectPr");
  const sectPrEnd = docXml.indexOf("</w:sectPr>") + 11;
  const sectPr = docXml.substring(sectPrStart, sectPrEnd);

  const newBody =
    makeTitle() +
    makeLicenseLine() +
    makeIntro() +
    makeTable() +
    makeDateLine() +
    makeCompanyLine();

  const newDoc =
    docXml.substring(0, bodyOpenEnd) + newBody + sectPr + "</w:body></w:document>";

  zip.file("word/document.xml", newDoc);

  const output = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`Template saved: ${OUTPUT_PATH} (${output.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
