import type { PrismaClient } from "@prisma/client";

export class TransferenciaError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TransferenciaError";
    this.status = status;
  }
}

export interface DadosTransferencia {
  empreendimentoId: number;
  clienteNovoId: number;
}

export interface ResultadoTransferencia {
  empreendimentoId: number;
  clienteAnteriorId: number;
  clienteNovoId: number;
}

interface TxTransferencia {
  empreendimento: {
    findUnique(args: { where: { id: number }; select: { id: true; clienteId: true } }): Promise<{ id: number; clienteId: number } | null>;
    update(args: { where: { id: number }; data: { clienteId: number } }): Promise<unknown>;
  };
  cliente: {
    findUnique(args: { where: { id: number }; select: { id: true } }): Promise<{ id: number } | null>;
  };
}

export async function validarTransferencia(
  db: Pick<TxTransferencia, "empreendimento" | "cliente">,
  dados: DadosTransferencia
): Promise<ResultadoTransferencia> {
  const { empreendimentoId, clienteNovoId } = dados;

  const empreendimento = await db.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { id: true, clienteId: true },
  });
  if (!empreendimento) {
    throw new TransferenciaError("Empreendimento não encontrado", 404);
  }

  if (empreendimento.clienteId === clienteNovoId) {
    throw new TransferenciaError("O empreendimento já pertence a este cliente", 400);
  }

  const clienteAtual = await db.cliente.findUnique({
    where: { id: empreendimento.clienteId },
    select: { id: true },
  });
  if (!clienteAtual) {
    throw new TransferenciaError("O cliente atual do empreendimento não existe", 400);
  }

  const clienteNovo = await db.cliente.findUnique({
    where: { id: clienteNovoId },
    select: { id: true },
  });
  if (!clienteNovo) {
    throw new TransferenciaError("O cliente de destino não existe", 404);
  }

  return {
    empreendimentoId,
    clienteAnteriorId: empreendimento.clienteId,
    clienteNovoId,
  };
}

export async function transferirEmpreendimento(
  db: PrismaClient,
  dados: DadosTransferencia
): Promise<ResultadoTransferencia> {
  return db.$transaction(async (tx) => {
    const validado = await validarTransferencia(tx, dados);
    await tx.empreendimento.update({
      where: { id: dados.empreendimentoId },
      data: { clienteId: dados.clienteNovoId },
    });
    return validado;
  });
}