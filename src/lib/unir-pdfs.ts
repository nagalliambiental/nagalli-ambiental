import { PDFDocument } from "pdf-lib";

export async function unirPdfs(buffers: Uint8Array[]): Promise<Uint8Array> {
  const destino = await PDFDocument.create();
  for (const buffer of buffers) {
    const origem = await PDFDocument.load(buffer);
    const paginas = await destino.copyPages(origem, origem.getPageIndices());
    for (const pagina of paginas) destino.addPage(pagina);
  }
  return new Uint8Array(await destino.save());
}
