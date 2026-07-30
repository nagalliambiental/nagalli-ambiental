import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
export const dynamic = "force-static";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });

  const resultados: string[] = [];
  let importados = 0;

  for (const sheetName of wb.SheetNames) {
    const dados = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName]);

    if (sheetName === "Clientes") {
      for (const row of dados) {
        const apelido = (row["Apelido"] || "").trim();
        const cnpj = (row["CNPJ"] || "").replace(/\D/g, "");
        if (!apelido || !cnpj) continue;

        const payload: Prisma.ClienteCreateInput = {
          apelido,
          razaoSocial: (row["Razão Social"] || "").trim() || apelido,
          nomeFantasia: (row["Nome Fantasia"] || "").trim() || null,
          cnpj,
          telefone: (row["Telefone"] || "").trim() || "",
          email: (row["Email"] || "").trim() || "",
          respLegal: (row["Resp. Legal"] || "").trim() || "",
          rua: (row["Rua"] || "").trim() || null,
          numero: (row["Número"] || "").trim() || null,
          bairro: (row["Bairro"] || "").trim() || null,
          complemento: (row["Complemento"] || "").trim() || null,
          cep: (row["CEP"] || "").replace(/\D/g, "") || null,
          municipio: (row["Município"] || "").trim() || null,
          uf: (row["UF"] || "").trim() || null,
          ativo: (row["Ativo"] || "Sim").toLowerCase() !== "não",
        };

        const existente = await prisma.cliente.findUnique({ where: { cnpj } });
        if (existente) {
          await prisma.cliente.update({ where: { id: existente.id }, data: payload });
          resultados.push(`Cliente "${apelido}" atualizado`);
        } else {
          await prisma.cliente.create({ data: payload });
          resultados.push(`Cliente "${apelido}" criado`);
        }
        importados++;
      }
    }

    if (sheetName === "Empreendimentos") {
      for (const row of dados) {
        const apelido = (row["Apelido"] || "").trim();
        const clienteApelido = (row["Cliente"] || "").trim();
        if (!apelido || !clienteApelido) continue;

        const cliente = await prisma.cliente.findFirst({
          where: { apelido: { equals: clienteApelido, mode: "insensitive" } },
        });
        if (!cliente) {
          resultados.push(`Cliente "${clienteApelido}" não encontrado para "${apelido}"`);
          continue;
        }

        const payload: Prisma.EmpreendimentoCreateInput = {
          apelido,
          cliente: { connect: { id: cliente.id } },
          descricao: (row["Descrição"] || "").trim() || apelido,
          cnpj: (row["CNPJ"] || "").replace(/\D/g, "") || null,
          cep: (row["CEP"] || "").replace(/\D/g, "") || null,
          rua: (row["Rua"] || "").trim() || null,
          numero: (row["Número"] || "").trim() || null,
          bairro: (row["Bairro"] || "").trim() || null,
          complemento: (row["Complemento"] || "").trim() || null,
          municipio: (row["Município"] || "").trim() || null,
          uf: (row["UF"] || "").trim() || null,
          latitude: row["Latitude"] ? Number(row["Latitude"]) : null,
          longitude: row["Longitude"] ? Number(row["Longitude"]) : null,
          ativo: (row["Ativo"] || "Sim").toLowerCase() !== "não",
        };

        const existente = await prisma.empreendimento.findFirst({
          where: { apelido, clienteId: cliente.id },
        });
        if (existente) {
          await prisma.empreendimento.update({ where: { id: existente.id }, data: payload });
          resultados.push(`Empreendimento "${apelido}" atualizado`);
        } else {
          await prisma.empreendimento.create({ data: payload });
          resultados.push(`Empreendimento "${apelido}" criado`);
        }
        importados++;
      }
    }
  }

  return NextResponse.json({ importados, detalhes: resultados });
}
