import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const wb = XLSX.utils.book_new();

  const clientesHeader = [
    { Apelido: "", "Razão Social": "", "Nome Fantasia": "", CNPJ: "", Telefone: "", Email: "", "Resp. Legal": "", CEP: "", Rua: "", Número: "", Bairro: "", Complemento: "", Município: "", UF: "", Ativo: "Sim" },
  ];
  const cs = XLSX.utils.json_to_sheet(clientesHeader);
  XLSX.utils.book_append_sheet(wb, cs, "Clientes");

  const empHeader = [
    { Apelido: "", Cliente: "", CNPJ: "", Descrição: "", CEP: "", Rua: "", Número: "", Bairro: "", Complemento: "", Município: "", UF: "", Latitude: "", Longitude: "", Ativo: "Sim" },
  ];
  const es = XLSX.utils.json_to_sheet(empHeader);
  XLSX.utils.book_append_sheet(wb, es, "Empreendimentos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-cadastros.xlsx"',
    },
  });
}
