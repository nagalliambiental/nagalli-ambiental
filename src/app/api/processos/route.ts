import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { parseCondicionantes } from "@/lib/templates/relatorio-condicionantes/generate";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const processos = await prisma.processo.findMany({
    include: {
      orgao: true,
      empreendimento: { include: { cliente: true } },
      responsavel: true,
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(processos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const usuarioId = Number((session.user as { id: string }).id);

    const { autorizacaoCorte, ...processoData } = data;

    const processo = await prisma.processo.create({ data: processoData });

    if (autorizacaoCorte) {
      await prisma.autorizacaoCorte.create({
        data: {
          processoId: processo.id,
          quantidadeIndividuos: autorizacaoCorte.quantidadeIndividuos ?? null,
          compensacaoExigida: autorizacaoCorte.compensacaoExigida ?? false,
          tipoCompensacao: autorizacaoCorte.tipoCompensacao ?? null,
          quantidadeMudas: autorizacaoCorte.quantidadeMudas ?? null,
          areaCompensacaoM2: autorizacaoCorte.areaCompensacaoM2 ?? null,
          prazoCompensacao: autorizacaoCorte.prazoCompensacao ? new Date(autorizacaoCorte.prazoCompensacao) : null,
        },
      });
    }

    if (processoData.condicionantes) {
      const itens = parseCondicionantes(processoData.condicionantes);
      if (itens.length > 0) {
        await prisma.condicionante.createMany({
          data: itens.map((descricao) => ({
            descricao,
            processoId: processo.id,
            status: "pendente",
          })),
        });
      }
    }

    await prisma.timelineProcesso.create({
      data: {
        status: "protocolado",
        descricao: "Processo protocolado",
        processoId: processo.id,
        usuarioId,
      },
    });

    await logAuditoria(
      "criar",
      "processo",
      processo.id,
      data,
      usuarioId
    );

    return NextResponse.json(processo, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar processo" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.processo.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.processo.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
