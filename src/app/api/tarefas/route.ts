import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { dataInputParaDate } from "@/lib/format";
import { requerAutenticado } from "@/lib/perfil";
import { STATUS_TAREFA, PRIORIDADE_TAREFA } from "@/lib/constants";
import { criarExigenciaEspelhada, sincronizarExigenciaTarefa } from "@/lib/tarefas-exigencia";
import type { Prisma } from "@prisma/client";

const INCLUIR = {
  responsavel: { select: { id: true, nome: true } },
  usuario: { select: { id: true, nome: true } },
  empreendimento: { select: { id: true, apelido: true } },
  processo: { select: { id: true, numProtocolo: true, numLicenca: true } },
  condicionante: { select: { id: true, titulo: true } },
  exigencia: { select: { id: true, prazo: true, cumprida: true } },
  _count: { select: { anexos: true } },
} satisfies Prisma.TarefaInclude;

export async function GET(req: NextRequest) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const p = req.nextUrl.searchParams;
  const q = p.get("q")?.trim();
  const status = p.get("status");
  const responsavelId = p.get("responsavelId");
  const processoId = p.get("processoId");
  const condicionanteId = p.get("condicionanteId");
  const empreendimentoId = p.get("empreendimentoId");
  const importId = p.get("importId");

  const where: Prisma.TarefaWhereInput = { ativo: true };
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { descricao: { contains: q, mode: "insensitive" } },
      { observacoes: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (responsavelId) where.responsavelId = Number(responsavelId);
  if (processoId) where.processoId = Number(processoId);
  if (condicionanteId) where.condicionanteId = Number(condicionanteId);
  if (empreendimentoId) where.empreendimentoId = Number(empreendimentoId);
  if (importId) where.importId = importId;

  const tarefas = await prisma.tarefa.findMany({
    where,
    include: INCLUIR,
    orderBy: [{ prazoFinal: { sort: "asc", nulls: "last" } }, { criadoEm: "desc" }],
    take: 3000,
  });

  return NextResponse.json(tarefas);
}

export async function POST(request: Request) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  try {
    const data = await request.json();
    const titulo = String(data.titulo ?? "").trim();
    if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

    const status = data.status ?? STATUS_TAREFA.NAO_INICIADO;
    if (!Object.values(STATUS_TAREFA).includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    const prioridade = data.prioridade ?? PRIORIDADE_TAREFA.MEDIA;
    if (!Object.values(PRIORIDADE_TAREFA).includes(prioridade)) {
      return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 });
    }
    const responsavelId = data.responsavelId ?? data.responsavelPessoaId;
    if (!responsavelId) {
      return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });
    }

    const processoId = data.processoId ? Number(data.processoId) : null;
    const prazoRaw = data.prazoFinal ?? data.prazoData;
    const prazoFinal = prazoRaw ? dataInputParaDate(String(prazoRaw)) : null;
    const alertaPrazoFinal = Number(data.alertaPrazoFinal ?? data.alertaDias ?? 30);
    const dataConclusao =
      status === STATUS_TAREFA.CONCLUIDA ? (data.dataConclusao ? dataInputParaDate(data.dataConclusao) : new Date()) : null;

    const exigenciaId =
      processoId && data.criarExigencia !== false
        ? await criarExigenciaEspelhada({
            processoId,
            titulo,
            descricao: data.descricao ?? null,
            prazoFinal,
            alertaPrazoFinal,
          })
        : data.exigenciaId
          ? Number(data.exigenciaId)
          : null;

    const tarefa = await prisma.tarefa.create({
      data: {
        titulo,
        descricao: data.descricao?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        status,
        prioridade,
        prazoFinal,
        alertaPrazoFinal,
        dataLimite: data.dataLimite ? dataInputParaDate(data.dataLimite) : null,
        alertaDataLimite: Number(data.alertaDataLimite ?? 30),
        dataConclusao,
        responsavelId: Number(responsavelId),
        empreendimentoId: data.empreendimentoId ? Number(data.empreendimentoId) : null,
        processoId,
        condicionanteId: data.condicionanteId ? Number(data.condicionanteId) : null,
        exigenciaId,
        usuarioId: Number((authResult.user as { id: string }).id),
      },
      include: INCLUIR,
    });

    await logAuditoria("criar", "tarefa", tarefa.id, { titulo }, Number((authResult.user as { id: string }).id));

    return NextResponse.json(tarefa, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json({ error: "Erro ao criar tarefa" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.tarefa.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao remover tarefas:", e);
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const idList = ids.split(",").map(Number);
  const data: Prisma.TarefaUpdateManyMutationInput = {};

  if (body.status !== undefined) {
    if (!(Object.values(STATUS_TAREFA) as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    data.status = body.status;
    data.dataConclusao = body.status === STATUS_TAREFA.CONCLUIDA ? new Date() : null;
  }
  if (body.prioridade !== undefined && (Object.values(PRIORIDADE_TAREFA) as string[]).includes(body.prioridade)) {
    data.prioridade = body.prioridade;
  }
  if (body.prazoFinal !== undefined) data.prazoFinal = body.prazoFinal ? dataInputParaDate(body.prazoFinal) : null;

  await prisma.tarefa.updateMany({ where: { id: { in: idList } }, data });

  if (body.responsavelId !== undefined && body.responsavelId !== null && body.responsavelId !== "") {
    const dataResp: Prisma.TarefaUncheckedUpdateManyInput = { responsavelId: Number(body.responsavelId) };
    await prisma.tarefa.updateMany({ where: { id: { in: idList } }, data: dataResp });
  }

  if (body.status !== undefined) {
    const alvos = await prisma.tarefa.findMany({
      where: { id: { in: idList }, exigenciaId: { not: null } },
      select: { exigenciaId: true, status: true },
    });
    for (const t of alvos) await sincronizarExigenciaTarefa(t);
  }

  return NextResponse.json({ ok: true });
}
