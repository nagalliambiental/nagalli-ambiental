import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return NextResponse.json({ error: "Nenhuma aba encontrada" }, { status: 400 });
  }

  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];

  const ano = new Date().getFullYear();
  let ultimaEmpresa = "";
  let ultimoCnpj = "";

  const criados: { cliente?: string; empreendimento?: string }[] = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;

    const empresa = (row[0] || "").trim() || ultimaEmpresa;
    if (!empresa) continue;
    ultimaEmpresa = empresa;

    const identificacao = (row[1] || "").trim();
    if (!identificacao) continue;

    const unidade = (row[2] || "").toString().trim();
    const cnpjRaw = (row[3] || "").toString().trim();
    const cnpj = cnpjRaw || ultimoCnpj;
    if (cnpjRaw) ultimoCnpj = cnpj;

    const cnpjLimpo = cnpj.replace(/\D/g, "");

    let cliente = cnpjLimpo.length === 14
      ? await prisma.cliente.findUnique({ where: { cnpj: cnpjLimpo } })
      : null;

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          apelido: empresa,
          razaoSocial: empresa,
          cnpj: cnpjLimpo || `temp-${Date.now()}-${i}`,
          telefone: "",
          email: "",
          respLegal: "",
        },
      });
    }

    const apelidoEmp = `${identificacao} (${unidade})`;
    let empreendimento = await prisma.empreendimento.findFirst({
      where: { clienteId: cliente.id, apelido: apelidoEmp },
    });

    if (!empreendimento) {
      empreendimento = await prisma.empreendimento.create({
        data: {
          apelido: apelidoEmp,
          descricao: `${empresa} - ${identificacao}`,
          clienteId: cliente.id,
        },
      });
    }

    const existente = await prisma.controleDmr.findUnique({
      where: { empreendimentoId: empreendimento.id },
    });

    if (!existente) {
      await prisma.controleDmr.create({
        data: {
          empreendimentoId: empreendimento.id,
          ano,
        },
      });
    }

    criados.push({
      cliente: cliente.apelido,
      empreendimento: empreendimento.apelido,
    });
  }

  return NextResponse.json({
    total: criados.length,
    criados,
    mensagem: `${criados.length} empreendimento(s) importado(s) com sucesso.`,
  });
}
