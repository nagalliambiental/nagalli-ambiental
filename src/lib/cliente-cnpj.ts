export function normalizarCnpj(cnpj: string): string {
  return String(cnpj ?? "").replace(/\D/g, "");
}

export function cnpjsIguais(a: string, b: string): boolean {
  return normalizarCnpj(a) === normalizarCnpj(b);
}

export interface ClienteCnpjConflito {
  id: number;
  apelido: string;
}

interface DbBuscaCnpj {
  cliente: {
    findMany(args?: unknown): Promise<{ id: number; cnpj: string; apelido: string }[]>;
  };
}

export async function encontrarConflitoCnpj(
  db: DbBuscaCnpj,
  cnpj: string,
  excluirId?: number
): Promise<ClienteCnpjConflito | null> {
  const lavado = normalizarCnpj(cnpj);
  if (!lavado) return null;

  const clientes = await db.cliente.findMany({ select: { id: true, cnpj: true, apelido: true } });
  const conflito = clientes.find((c) => c.id !== excluirId && normalizarCnpj(c.cnpj) === lavado);
  return conflito ? { id: conflito.id, apelido: conflito.apelido } : null;
}