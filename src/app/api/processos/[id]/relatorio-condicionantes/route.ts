import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import {
  buildCondicionantesData,
  renderCondicionantesDocx,
  parseCondicionantes,
} from "@/lib/templates/relatorio-condicionantes/generate";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const processo = await prisma.processo.findUnique({
    where: { id: Number(id) },
    include: {
      empreendimento: { include: { cliente: true } },
      condicaoItens: { orderBy: { ordem: "asc" } },
    },
  });

  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  const hoje = new Date();
  const dataEmissao = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const cidadeUf = [processo.empreendimento.municipio, processo.empreendimento.uf]
    .filter(Boolean)
    .join(", ");
  const localidade = cidadeUf || "Localidade";

  const itensEstruturados = (processo as unknown as { condicaoItens?: Array<{ titulo: string; descricao: string | null; tipo: string; prazo: Date | null; cumprida: boolean }> }).condicaoItens;

  const LIMPAR_RE = [
    /EM\s+BRANCO/gi,
    /Instituto\s+\u00c1gua\s+e\s+Terra[^\n]*/gi,
    /Rua\s+Engenheiros\s+Rebou[çc]as[^\n]*/gi,
    /Assinatura\s+do\s+Representante[^\n]*/gi,
    /P\u00e1gina\s+\d+[^\n]*/gi,
    /LP\s+N[ºo]\s+\d+[^\n]*/gi,
  ];

  function limparTexto(t: string): string {
    let r = t;
    for (const re of LIMPAR_RE) r = r.replace(re, " ");
    return r.replace(/\s{2,}/g, " ").trim();
  }

  let linhas: string[];
  if (itensEstruturados && itensEstruturados.length > 0) {
    linhas = itensEstruturados.map((c, i) => {
      const num = `${i + 1}.`;
      const tipo = c.tipo === "exigencia" ? " [EXIGÊNCIA]" : "";
      const prazo = c.prazo ? ` — Prazo: ${new Date(c.prazo).toLocaleDateString("pt-BR")}` : "";
      const texto = limparTexto(c.descricao || c.titulo);
      return `${num} ${texto}${tipo}${prazo}`;
    });
  } else {
    linhas = parseCondicionantes((processo as { condicionantes?: string | null }).condicionantes).map(limparTexto);
  }

  const data = buildCondicionantesData(
    processo,
    { razaoSocial: processo.empreendimento.cliente.razaoSocial },
    `${localidade}, ${dataEmissao}`,
    linhas
  );

  let buffer: Buffer;
  try {
    buffer = renderCondicionantesDocx(data);
  } catch (err) {
    console.error("Erro ao renderizar relatório de condicionantes:", err);
    return NextResponse.json({ error: "Erro ao gerar o relatório" }, { status: 500 });
  }

  const safeName = `Relatorio_de_Condicionantes_${processo.empreendimento.apelido}.docx`.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  const caminho = `/uploads/documentos/${safeName}`;
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documentos");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);
  } catch (saveErr) {
    console.error("Erro ao salvar arquivo em disco:", saveErr);
  }

  try {
    const docExistente = await prisma.documento.findFirst({
      where: {
        processoId: processo.id,
        nome: { contains: "Relatório de condicionantes" },
      },
    });

    if (!docExistente) {
      const documento = await prisma.documento.create({
        data: {
          nome: "Relatório de condicionantes",
          tipo: "relatorio",
          caminho,
          tamanho: buffer.length,
          processoId: processo.id,
        },
      });

      await logAuditoria(
        "criar",
        "documento",
        documento.id,
        { nome: "Relatório de condicionantes", caminho },
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
