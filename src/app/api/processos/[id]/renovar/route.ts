import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const pId = Number(id);
  const usuarioId = Number((session.user as { id: string }).id);

  const original = await prisma.processo.findUnique({ where: { id: pId } });
  if (!original) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  try {
    const novo = await prisma.$transaction(async (tx) => {
      const processo = await tx.processo.create({
        data: {
          tipo: original.tipo,
          orgaoId: original.orgaoId,
          sistema: original.sistema,
          numProtocolo: "",
          status: "protocolado",
          empreendimentoId: original.empreendimentoId,
          responsavelId: original.responsavelId,
          alertaDias: original.alertaDias,
          condicionantes: original.condicionantes,
          observacoes: `Renovação do processo ${original.numProtocolo || original.id}${original.observacoes ? `\n\n${original.observacoes}` : ""}`,
        },
      });

      await tx.timelineProcesso.create({
        data: {
          status: "protocolado",
          descricao: `Processo criado como renovação de ${original.numProtocolo || original.id}`,
          processoId: processo.id,
          usuarioId,
        },
      });

      await tx.processo.update({
        where: { id: original.id },
        data: { renovacaoPendente: true },
      });

      await tx.timelineProcesso.create({
        data: {
          status: original.status,
          descricao: `Renovação iniciada — novo processo ${processo.id}`,
          processoId: original.id,
          usuarioId,
        },
      });

      return processo;
    });

    await logAuditoria(
      "criar",
      "processo",
      novo.id,
      { renovacaoDe: original.id, numProtocolo: original.numProtocolo },
      usuarioId
    ).catch(() => {});

    return NextResponse.json({ id: novo.id, numProtocolo: novo.numProtocolo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao criar renovação:", message);
    return NextResponse.json({ error: `Erro ao criar renovação: ${message}` }, { status: 500 });
  }
}