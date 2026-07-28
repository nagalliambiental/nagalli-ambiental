import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORGAOS = [
  { sigla: "IAT", nome: "Instituto Água e Terra" },
  { sigla: "IMA", nome: "Instituto do Meio Ambiente" },
  { sigla: "FEPAM", nome: "Fundação Estadual de Proteção Ambiental" },
  { sigla: "CETESB", nome: "Companhia Ambiental do Estado de São Paulo" },
  { sigla: "IMASUL", nome: "Instituto de Meio Ambiente de Mato Grosso do Sul" },
  { sigla: "SMMA", nome: "Secretaria Municipal de Meio Ambiente" },
];

export async function GET() {
  for (const o of ORGAOS) {
    await prisma.orgao.upsert({
      where: { sigla: o.sigla },
      update: { nome: o.nome },
      create: o,
    });
  }

  const orgaos = await prisma.orgao.findMany({ orderBy: { sigla: "asc" } });
  return NextResponse.json(orgaos);
}
