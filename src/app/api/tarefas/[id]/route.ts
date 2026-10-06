import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { dataInputParaDate } from "@/lib/format";
import { requerAutenticado } from "@/lib/perfil";
import { STATUS_TAREFA, PRIORIDADE_TAREFA } from "@/lib/constants";
import { criarExigenciaEspelhada, sincronizarExigenciaTarefa } from "@/lib/tarefas-exigencia";
import {
  atualizarSerie,
  criarSerie,
  ehRecorrenciaValida,
  gerarProximaOcorrencia,
  type OpcoesSerie,
  type PeriodoEntrada,
} from "@/lib/tarefas-recorrencia";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const INCLUIR = {
  responsavel: { select: { id: true, nome: true, email: true, telefone: true } },
  usuario: { select: { id: true, nome: true } },
  empreendimento: { select: { id: true, apelido: true } },
  processo: { select: { id: true, numProtocolo: true, numLicenca: true, tipo: true } },
  condicionante: { select: { id: true, titulo: true } },
  exigencia: { select: { id: true, prazo: true, cumprida: true, descricao: true } },
  serie: {
    include: {
      periodos: {
        include: { responsavel: { select: { id: true, nome: true } } },
        orderBy: { inicio: "asc" as const },
      },
    },
  },
  anexos: {
    select: { id: true, nome: true, mime: true, tamanho: true, criadoEm: true },
    orderBy: { criadoEm: "desc" as const },
  },
  _count: { select: { anexos: true } },
} satisfies Prisma.TarefaInclude;

export async function GET(_req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) }, include: INCLUIR });
  if (!tarefa || !tarefa.ativo) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  return NextResponse.json(tarefa);
}

async function aplicarCorpo(
  tarefaId: number,
  body: Record<string, unknown>,
  usuarioId: number
): Promise<{ erro: NextResponse | null }> {
  const atual = await prisma.tarefa.findUnique({ where: { id: tarefaId } });
  if (!atual || !atual.ativo) {
    return { erro: NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 }) };
  }

  const status = body.status !== undefined ? String(body.status) : atual.status;
  if (!(Object.values(STATUS_TAREFA) as string[]).includes(status)) {
    return { erro: NextResponse.json({ error: "Status inválido" }, { status: 400 }) };
  }
  const prioridade =
    body.prioridade !== undefined && (Object.values(PRIORIDADE_TAREFA) as string[]).includes(String(body.prioridade))
      ? String(body.prioridade)
      : atual.prioridade;

  const titulo = body.titulo !== undefined ? String(body.titulo ?? "").trim() || atual.titulo : atual.titulo;
  const processoId =
    body.processoId !== undefined ? (body.processoId ? Number(body.processoId) : null) : atual.processoId;
  const condicionanteId =
    body.condicionanteId !== undefined
      ? body.condicionanteId
        ? Number(body.condicionanteId)
        : null
      : atual.condicionanteId;

  const prazoFinal =
    body.prazoFinal !== undefined
      ? body.prazoFinal
        ? dataInputParaDate(String(body.prazoFinal))
        : null
      : atual.prazoFinal;

  const alertaPrazoFinal =
    body.alertaPrazoFinal !== undefined ? Number(body.alertaPrazoFinal) : atual.alertaPrazoFinal;

  const dataConclusao =
    status === STATUS_TAREFA.CONCLUIDA
      ? body.dataConclusao
        ? dataInputParaDate(String(body.dataConclusao))
        : (atual.dataConclusao ?? new Date())
      : null;

  let exigenciaId = body.exigenciaId !== undefined ? (body.exigenciaId ? Number(body.exigenciaId) : null) : atual.exigenciaId;

  if (
    processoId &&
    processoId !== atual.processoId &&
    body.criarExigencia !== false &&
    !exigenciaId
  ) {
    exigenciaId = await criarExigenciaEspelhada({
      processoId,
      titulo,
      descricao: body.descricao !== undefined ? (body.descricao as string | null) : atual.descricao,
      prazoFinal,
      alertaPrazoFinal,
    });
  }

  const virouConcluida = atual.status !== STATUS_TAREFA.CONCLUIDA && status === STATUS_TAREFA.CONCLUIDA;

  let serieId = atual.serieId;
  if (body.recorrencia !== undefined) {
    const rec = body.recorrencia;
    if (!rec) {
      serieId = null;
    } else {
      if (!ehRecorrenciaValida(rec)) {
        return { erro: NextResponse.json({ error: "Recorrência inválida" }, { status: 400 }) };
      }
      const periodos = (body.periodos ?? []) as PeriodoEntrada[];
      const opcoesSerie: OpcoesSerie = {
        ...(body.recorrenciaAtiva !== undefined ? { ativo: body.recorrenciaAtiva !== false } : {}),
        ...(body.fimRecorrencia !== undefined
          ? { fimRecorrencia: body.fimRecorrencia ? dataInputParaDate(String(body.fimRecorrencia)) : null }
          : {}),
      };
      try {
        if (serieId) {
          await atualizarSerie(serieId, rec, periodos, opcoesSerie);
        } else {
          serieId = await criarSerie(rec, periodos, {
            ativo: opcoesSerie.ativo ?? true,
            fimRecorrencia: opcoesSerie.fimRecorrencia ?? null,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro na escala de períodos";
        return { erro: NextResponse.json({ error: msg }, { status: 400 }) };
      }
    }
  }

  const tarefa = await prisma.tarefa.update({
    where: { id: tarefaId },
    data: {
      titulo,
      descricao: body.descricao !== undefined ? ((body.descricao as string | null) || null) : atual.descricao,
      observacoes: body.observacoes !== undefined ? ((body.observacoes as string | null) || null) : atual.observacoes,
      status,
      prioridade,
      prazoFinal,
      alertaPrazoFinal,
      dataLimite:
        body.dataLimite !== undefined
          ? body.dataLimite
            ? dataInputParaDate(String(body.dataLimite))
            : null
          : atual.dataLimite,
      alertaDataLimite: body.alertaDataLimite !== undefined ? Number(body.alertaDataLimite) : atual.alertaDataLimite,
      dataConclusao,
      responsavelId:
        body.responsavelId !== undefined && body.responsavelId !== null && body.responsavelId !== ""
          ? Number(body.responsavelId)
          : atual.responsavelId,
      empreendimentoId:
        body.empreendimentoId !== undefined
          ? body.empreendimentoId
            ? Number(body.empreendimentoId)
            : null
          : atual.empreendimentoId,
      processoId,
      condicionanteId,
      exigenciaId,
      serieId,
      statusObs: body.statusObs !== undefined ? ((body.statusObs as string | null) || null) : atual.statusObs,
      ativo: body.ativo !== undefined ? Boolean(body.ativo) : atual.ativo,
    },
    include: INCLUIR,
  });

  await sincronizarExigenciaTarefa({ exigenciaId: tarefa.exigenciaId, status: tarefa.status });

  if (virouConcluida) {
    try {
      await prisma.notificacao.updateMany({
        where: { tarefaId: tarefa.id, lida: false },
        data: { lida: true },
      });
    } catch (e) {
      console.error("Erro ao marcar notificações da tarefa como lidas:", e);
    }
  }

  if (virouConcluida && tarefa.serieId) {
    try {
      await gerarProximaOcorrencia(tarefa, usuarioId);
    } catch (e) {
      console.error("Erro ao gerar próxima ocorrência da tarefa recorrente:", e);
    }
  }

  return { erro: null };
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  try {
    const { erro } = await aplicarCorpo(Number(id), body, Number((authResult.user as { id: string }).id));
    if (erro) return erro;
    const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) }, include: INCLUIR });
    await logAuditoria("atualizar", "tarefa", Number(id), body, Number((authResult.user as { id: string }).id));
    return NextResponse.json(tarefa);
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  try {
    const { erro } = await aplicarCorpo(Number(id), body, Number((authResult.user as { id: string }).id));
    if (erro) return erro;
    const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) }, include: INCLUIR });
    await logAuditoria("atualizar", "tarefa", Number(id), body, Number((authResult.user as { id: string }).id));
    return NextResponse.json(tarefa);
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) } });
  if (!tarefa || !tarefa.ativo) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  await prisma.$transaction([
    prisma.tarefa.update({ where: { id: Number(id) }, data: { ativo: false } }),
    ...(tarefa.exigenciaId
      ? [prisma.exigencia.update({ where: { id: tarefa.exigenciaId }, data: { ativo: false, cumprida: false } })]
      : []),
  ]);

  await logAuditoria("excluir", "tarefa", Number(id), { titulo: tarefa.titulo }, Number((authResult.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Tarefa excluída" });
}
