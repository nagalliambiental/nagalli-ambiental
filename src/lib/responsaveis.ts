import { prisma } from "@/lib/prisma";

export type ResponsavelOpcao = {
  id: number;
  nome: string;
  email: string;
  funcao: string;
  usuarioId: number | null;
};

/**
 * Responsável no sistema = usuário cadastrado.
 * Espelha usuários ativos no model Responsavel (que possui usuarioId)
 * e devolve a lista para selects de tarefas/processos.
 */
export async function listarResponsaveis(): Promise<ResponsavelOpcao[]> {
  const usuarios = await prisma.usuario.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  const espelhos = await prisma.responsavel.findMany({
    where: { usuarioId: { not: null } },
  });
  const porUsuario = new Map(espelhos.map((r) => [r.usuarioId, r]));

  for (const u of usuarios) {
    const atual = porUsuario.get(u.id);
    if (!atual) {
      const criado = await prisma.responsavel.create({
        data: { nome: u.nome, email: u.email, funcao: u.perfil || "técnico", usuarioId: u.id },
      });
      porUsuario.set(u.id, criado);
    } else if (atual.nome !== u.nome || atual.email !== u.email || atual.funcao !== (u.perfil || "técnico")) {
      const atualizado = await prisma.responsavel.update({
        where: { id: atual.id },
        data: { nome: u.nome, email: u.email, funcao: u.perfil || "técnico" },
      });
      porUsuario.set(u.id, atualizado);
    }
  }

  const idsUsuariosAtivos = new Set(usuarios.map((u) => u.id));
  const outros = await prisma.responsavel.findMany({
    where: { usuarioId: null },
    orderBy: { nome: "asc" },
  });
  const espelhosAtivos = [...porUsuario.values()]
    .filter((r) => r.usuarioId != null && idsUsuariosAtivos.has(r.usuarioId))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return [...espelhosAtivos, ...outros].map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    funcao: r.funcao,
    usuarioId: r.usuarioId,
  }));
}
