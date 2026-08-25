import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { extrairTextoComOcr, extrairSecaoCondicionantes, dividirTextoEmItens, extrairDadosEmpreendimento, classificarCondicionante } from "@/lib/extract-license";

type Params = { params: Promise<{ id: string }> };

const EXTENSOES_OK = new Set(["pdf", "jpg", "jpeg", "png", "tiff", "tif", "bmp"]);

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!EXTENSOES_OK.has(ext)) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie um PDF ou imagem (JPG, PNG, TIFF, BMP)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const texto = await extrairTextoComOcr(buffer, ext);

    if (texto.replace(/\s+/g, "").length < 30) {
      return NextResponse.json(
        { error: "Não foi possível ler texto do documento. Verifique se o arquivo está nítido e tente novamente." },
        { status: 422 }
      );
    }

    const secao = extrairSecaoCondicionantes(texto);

    if (!secao) {
      return NextResponse.json(
        {
          erro: "Documento não possui seção de CONDICIONANTES identificável.",
        },
        { status: 422 }
      );
    }

    const extraidas = dividirTextoEmItens(secao);

    const dadosEmp = extrairDadosEmpreendimento(texto);

    if (extraidas.length === 0 && !dadosEmp) {
      return NextResponse.json(
        { error: "Seção de condicionantes encontrada, mas não foi possível identificar itens numerados ou listados. Crie manualmente ou cole via 'Converter texto existente'." },
        { status: 422 }
      );
    }

    const ultima = await prisma.condicionante.findFirst({
      where: { processoId },
      orderBy: [{ ordem: "desc" }],
      select: { ordem: true },
    });

    const todos = [
      ...extraidas.map((c) => ({ titulo: c.titulo, descricao: c.descricao, tipo: classificarCondicionante(c.descricao) })),
      ...(dadosEmp ? [{ titulo: "Dados do Empreendimento", descricao: dadosEmp, tipo: "informativa" as const }] : []),
    ];

    await prisma.condicionante.createMany({
      data: todos.map((c, i) => ({
        processoId,
        titulo: c.titulo,
        descricao: c.descricao,
        tipo: c.tipo,
        ordem: (ultima?.ordem ?? 0) + i + 1,
        origem: "extracao",
      })),
    });

    await logAuditoria("criar", "Condicionante", processoId, {
      acao: "extrairDocumento",
      arquivo: file.name,
      itens: todos.length,
    });

    return NextResponse.json({ criados: todos.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao extrair condicionantes:", message);
    return NextResponse.json({ error: `Erro ao processar documento: ${message}` }, { status: 500 });
  }
}
