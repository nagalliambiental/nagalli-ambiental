import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const clientes = await prisma.cliente.findMany({ orderBy: { apelido: "asc" } });
  const empreendimentos = await prisma.empreendimento.findMany({
    include: { cliente: { select: { apelido: true } } },
    orderBy: { apelido: "asc" },
  });

  const wb = XLSX.utils.book_new();

  const clientesSheet = XLSX.utils.json_to_sheet(
    clientes.map((c) => ({
      Apelido: c.apelido,
      "Razão Social": c.razaoSocial,
      "Nome Fantasia": c.nomeFantasia || "",
      CNPJ: c.cnpj,
      Telefone: c.telefone,
      Email: c.email,
      "Resp. Legal": c.respLegal,
      CEP: c.cep || "",
      Rua: c.rua || "",
      Número: c.numero || "",
      Bairro: c.bairro || "",
      Complemento: c.complemento || "",
      Município: c.municipio || "",
      UF: c.uf || "",
      Ativo: c.ativo ? "Sim" : "Não",
    }))
  );
  XLSX.utils.book_append_sheet(wb, clientesSheet, "Clientes");

  const empSheet = XLSX.utils.json_to_sheet(
    empreendimentos.map((e) => ({
      Apelido: e.apelido,
      Cliente: e.cliente.apelido,
      CNPJ: e.cnpj || "",
      Descrição: e.descricao,
      CEP: e.cep || "",
      Rua: e.rua || "",
      Número: e.numero || "",
      Bairro: e.bairro || "",
      Complemento: e.complemento || "",
      Município: e.municipio || "",
      UF: e.uf || "",
      Latitude: e.latitude ?? "",
      Longitude: e.longitude ?? "",
      Ativo: e.ativo ? "Sim" : "Não",
    }))
  );
  XLSX.utils.book_append_sheet(wb, empSheet, "Empreendimentos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cadastros-${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}
