import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import {
  transferirEmpreendimento,
  TransferenciaError,
  type ResultadoTransferencia,
} from "../src/lib/transferir-empreendimento";

interface EstadoFake {
  empreendimentos: Map<number, { clienteId: number }>;
  processos: Map<number, { empreendimentoId: number }>;
  clientes: Set<number>;
}

interface TipoUpdate {
  where: { id: number };
  data: { clienteId: number };
}

interface TxFake {
  empreendimento: {
    findUnique(args: { where: { id: number } }): Promise<{ id: number; clienteId: number } | null>;
    update(args: TipoUpdate): Promise<{ id: number; clienteId: number } | null>;
  };
  cliente: {
    findUnique(args: { where: { id: number } }): Promise<{ id: number } | null>;
  };
}

function criarTxFake(estado: EstadoFake, updates: TipoUpdate[]): TxFake {
  return {
    empreendimento: {
      findUnique: async ({ where }) =>
        estado.empreendimentos.has(where.id)
          ? { id: where.id, clienteId: estado.empreendimentos.get(where.id)!.clienteId }
          : null,
      update: async ({ where, data }) => {
        updates.push({ where, data });
        const atual = estado.empreendimentos.get(where.id);
        if (!atual) return null;
        atual.clienteId = data.clienteId;
        return { id: where.id, clienteId: data.clienteId };
      },
    },
    cliente: {
      findUnique: async ({ where }) => (estado.clientes.has(where.id) ? { id: where.id } : null),
    },
  };
}

function criarDbFake(estado: EstadoFake) {
  const updates: TipoUpdate[] = [];
  const tx = criarTxFake(estado, updates);
  const db = {
    tx,
    updates,
    $transaction: async <T>(fn: (txParam: TxFake) => Promise<T>): Promise<T> => {
      const snapshot = new Map(
        [...estado.empreendimentos.entries()].map(([k, v]) => [k, { ...v }])
      );
      try {
        return await fn(tx);
      } catch (erro) {
        estado.empreendimentos = new Map(snapshot);
        throw erro;
      }
    },
    getUpdates: () => updates,
  };
  return db;
}

test("transferência para cliente inexistente → erro e nada é alterado", async () => {
  const estado: EstadoFake = {
    empreendimentos: new Map([[5, { clienteId: 1 }]]),
    processos: new Map([[11, { empreendimentoId: 5 }]]),
    clientes: new Set([1]),
  };
  const db = criarDbFake(estado) as unknown as PrismaClient;

  await assert.rejects(
    () => transferirEmpreendimento(db, { empreendimentoId: 5, clienteNovoId: 999 }),
    (erro: unknown) =>
      erro instanceof TransferenciaError &&
      erro.message === "O cliente de destino não existe" &&
      erro.status === 404
  );

  assert.equal(estado.empreendimentos.get(5)!.clienteId, 1);
  assert.equal(db.getUpdates().length, 0);
});

test("transferência para o mesmo cliente → erro", async () => {
  const estado: EstadoFake = {
    empreendimentos: new Map([[5, { clienteId: 1 }]]),
    processos: new Map([[11, { empreendimentoId: 5 }]]),
    clientes: new Set([1, 2]),
  };
  const db = criarDbFake(estado) as unknown as PrismaClient;

  await assert.rejects(
    () => transferirEmpreendimento(db, { empreendimentoId: 5, clienteNovoId: 1 }),
    (erro: unknown) => erro instanceof TransferenciaError && erro.message.includes("já pertence")
  );

  assert.equal(estado.empreendimentos.get(5)!.clienteId, 1);
});

test("empreendimento inexistente → erro 404", async () => {
  const estado: EstadoFake = {
    empreendimentos: new Map(),
    processos: new Map(),
    clientes: new Set([1]),
  };
  const db = criarDbFake(estado) as unknown as PrismaClient;

  await assert.rejects(
    () => transferirEmpreendimento(db, { empreendimentoId: 999, clienteNovoId: 1 }),
    (erro: unknown) => erro instanceof TransferenciaError && erro.status === 404
  );
});

test("transferência com sucesso move o empreendimento e preserva as licenças", async () => {
  const estado: EstadoFake = {
    empreendimentos: new Map([[5, { clienteId: 1 }]]),
    processos: new Map([
      [11, { empreendimentoId: 5 }],
      [12, { empreendimentoId: 5 }],
    ]),
    clientes: new Set([1, 2]),
  };
  const db = criarDbFake(estado) as unknown as PrismaClient;

  const resultado: ResultadoTransferencia = await transferirEmpreendimento(db, {
    empreendimentoId: 5,
    clienteNovoId: 2,
  });

  assert.deepEqual(resultado, {
    empreendimentoId: 5,
    clienteAnteriorId: 1,
    clienteNovoId: 2,
  });
  assert.equal(estado.empreendimentos.get(5)!.clienteId, 2);
  assert.equal(estado.processos.get(11)!.empreendimentoId, 5);
  assert.equal(estado.processos.get(12)!.empreendimentoId, 5);
  assert.equal(db.getUpdates().length, 1);
  assert.equal(db.getUpdates()[0].data.clienteId, 2);
});

test("falha após o update reverte a mudança (rollback transacional)", async () => {
  const estado: EstadoFake = {
    empreendimentos: new Map([[5, { clienteId: 1 }]]),
    processos: new Map(),
    clientes: new Set([1, 2]),
  };

  const tx: TxFake = {
    empreendimento: {
      findUnique: async () => ({ id: 5, clienteId: 1 }),
      update: async () => {
        throw new Error("falha simulada no banco");
      },
    },
    cliente: {
      findUnique: async () => ({ id: 2 }),
    },
  };

  const db = {
    $transaction: async <T>(fn: (txParam: TxFake) => Promise<T>): Promise<T> => {
      const antes = estado.empreendimentos.get(5)!.clienteId;
      try {
        await fn(tx);
      } catch (erro) {
        estado.empreendimentos.set(5, { clienteId: antes });
        throw erro;
      }
      return undefined as T;
    },
  };

  await assert.rejects(
    () => transferirEmpreendimento(db as unknown as PrismaClient, { empreendimentoId: 5, clienteNovoId: 2 }),
    /falha simulada/
  );
  assert.equal(estado.empreendimentos.get(5)!.clienteId, 1);
});