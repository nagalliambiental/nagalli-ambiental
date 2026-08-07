import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const PERFIS = {
  SOCIO: "socio",
  ADMIN: "admin",
  TECNICO: "tecnico",
} as const;

export type Perfil = (typeof PERFIS)[keyof typeof PERFIS];

export interface SessaoUsuario {
  id: string;
  perfil?: string;
}

export function ehPrivilegiado(perfil?: string) {
  return perfil === PERFIS.SOCIO || perfil === PERFIS.ADMIN;
}

export async function requerAutenticado(): Promise<
  | { ok: true; user: SessaoUsuario; erro: null }
  | { ok: false; user: null; erro: NextResponse }
> {
  const session = await auth();
  const user = session?.user as SessaoUsuario | undefined;
  if (!user) {
    return {
      ok: false,
      user: null,
      erro: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }
  return { ok: true, user, erro: null };
}

export async function requerPerfil(
  perfis: Perfil[] | Perfil
): Promise<
  | { ok: true; user: SessaoUsuario; erro: null }
  | { ok: false; user: null; erro: NextResponse }
> {
  const permitidos = Array.isArray(perfis) ? perfis : [perfis];
  const { user, erro, ok } = await requerAutenticado();
  if (erro) return { ok, user, erro };

  const perfil = user.perfil;
  if (!perfil || !permitidos.includes(perfil as Perfil)) {
    return {
      ok: false,
      user: null,
      erro: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }),
    };
  }
  return { ok: true, user, erro: null };
}
