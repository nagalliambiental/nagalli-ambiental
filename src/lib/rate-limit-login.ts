import { prisma } from "@/lib/prisma";

/** Janela de observação das tentativas de login falhas. */
export const JANELA_MINUTOS = 15;
/** Máximo de tentativas falhas por e-mail dentro da janela antes do bloqueio. */
export const MAX_TENTATIVAS = 5;

function janelaInicio(): Date {
  return new Date(Date.now() - JANELA_MINUTOS * 60_000);
}

/**
 * Retorna true quando o e-mail excedeu o limite de tentativas falhas na janela.
 * Usa a tabela LoginTentativa (persiste entre instâncias serverless).
 */
export async function loginBloqueado(chave: string): Promise<boolean> {
  const total = await prisma.loginTentativa.count({
    where: { chave, criadoEm: { gte: janelaInicio() } },
  });
  return total >= MAX_TENTATIVAS;
}

export async function registrarTentativaFalha(chave: string): Promise<void> {
  await prisma.loginTentativa.create({ data: { chave } });
  // limpeza das tentativas antigas (fora da janela de 24h)
  await prisma.loginTentativa.deleteMany({
    where: { criadoEm: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
}

/** Zera as tentativas do e-mail após um login bem-sucedido. */
export async function limparTentativas(chave: string): Promise<void> {
  await prisma.loginTentativa.deleteMany({ where: { chave } });
}
