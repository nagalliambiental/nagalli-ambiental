/**
 * Normaliza a lista de responsáveis adicionais: remove vazios, duplicados
 * e o próprio responsável principal (que já é o `responsavelId` da tarefa).
 */
export function normalizarAdicionais(
  responsavelId: number,
  ids: unknown
): number[] {
  if (!Array.isArray(ids)) return [];
  const vistos = new Set<number>();
  for (const item of ids) {
    const n = Number(item);
    if (!Number.isInteger(n) || n <= 0 || n === responsavelId || vistos.has(n)) continue;
    vistos.add(n);
  }
  return [...vistos];
}

export function nomesAdicionais(
  lista: { responsavel: { nome: string } }[] | null | undefined
): string[] {
  if (!Array.isArray(lista)) return [];
  return lista.map((r) => r.responsavel.nome).filter(Boolean);
}
