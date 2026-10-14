import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { renderEmbargosDocx, embargosVazios } from "@/lib/templates/embargos/generate";
import { mascararCpfCnpj, normalizarCnpj } from "@/lib/cliente-cnpj";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function comporEndereco(c: {
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
}): string {
  const inicio = [c.rua, c.numero].filter(Boolean).join(", ");
  const fim = [c.municipio, c.uf].filter(Boolean).join("/");
  return [inicio, c.complemento, c.bairro, fim].filter(Boolean).join(", ");
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const processo = await prisma.processo.findUnique({
    where: { id: Number(id) },
    include: { empreendimento: { include: { cliente: true } } },
  });
  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const cliente = processo.empreendimento.cliente;
  const hoje = new Date();

  const cnpj = normalizarCnpj(String(body.cnpj ?? cliente.cnpj ?? ""));
  const dados = {
    ...embargosVazios(),
    razao_social: String(body.razao_social ?? cliente.razaoSocial ?? ""),
    cnpj: cnpj ? mascararCpfCnpj(cnpj) : "",
    endereco: String(
      body.endereco ??
        comporEndereco({
          rua: cliente.rua,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          municipio: cliente.municipio,
          uf: cliente.uf,
        })
    ),
    tipo_licenca: String(body.tipo_licenca ?? processo.tipo ?? ""),
    municipio_data: String(body.municipio_data ?? cliente.municipio ?? processo.municipio ?? ""),
    dia: String(body.dia ?? String(hoje.getDate())),
    mes: String(body.mes ?? MESES[hoje.getMonth()]),
    ano: String(body.ano ?? String(hoje.getFullYear())),
  };

  let buffer: Buffer;
  try {
    buffer = renderEmbargosDocx(dados);
  } catch (err) {
    console.error("Erro ao gerar declaração de embargos:", err);
    return NextResponse.json({ error: "Erro ao gerar a declaração" }, { status: 500 });
  }

  const safeName = `Declaracao_de_embargos_${processo.empreendimento.apelido}.docx`.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
  const caminho = `/uploads/documentos/${safeName}`;
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documentos");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);
  } catch (saveErr) {
    console.error("Erro ao salvar arquivo em disco:", saveErr);
  }

  try {
    const docExistente = await prisma.documento.findFirst({
      where: { processoId: processo.id, nome: { contains: "Declaração de embargos" } },
    });
    if (!docExistente) {
      const documento = await prisma.documento.create({
        data: {
          nome: "Declaração de embargos",
          tipo: "declaracao",
          caminho,
          tamanho: buffer.length,
          processoId: processo.id,
        },
      });
      await logAuditoria(
        "criar",
        "documento",
        documento.id,
        { nome: "Declaração de embargos", caminho },
        Number((session.user as { id: string }).id)
      );
    }
  } catch (dbErr) {
    console.error("Erro ao salvar registro do documento no banco:", dbErr);
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}
