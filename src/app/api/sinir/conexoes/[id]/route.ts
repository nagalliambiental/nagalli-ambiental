import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criptografar } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const ehPrivilegiado = perfil === "socio" || perfil === "admin";

  const { id } = await params;
  const conexao = await prisma.sinirConexao.findUnique({ where: { id: Number(id) } });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { nome, cnpj, unidade, empreendimentoId, token, modo, venceEm, ativo } = body;

  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome;
  if (cnpj !== undefined) data.cnpj = String(cnpj).replace(/\D/g, "");
  if (unidade !== undefined) data.unidade = String(unidade);
  if (empreendimentoId !== undefined) data.empreendimentoId = empreendimentoId ? Number(empreendimentoId) : null;
  if (modo !== undefined) {
    if (modo !== "mock" && modo !== "real") {
      return NextResponse.json({ error: "modo deve ser 'mock' ou 'real'" }, { status: 400 });
    }
    if (modo === "real" && !ehPrivilegiado) {
      return NextResponse.json({ error: "Apenas sócio ou administrador pode ativar o modo real" }, { status: 403 });
    }
    data.modo = modo;
  }
  if (token !== undefined) {
    if (!ehPrivilegiado) {
      return NextResponse.json({ error: "Apenas sócio ou administrador pode alterar o token" }, { status: 403 });
    }
    data.token = token ? criptografar(String(token)) : null;
  }
  if (venceEm !== undefined) {
    if (!ehPrivilegiado) {
      return NextResponse.json({ error: "Apenas sócio ou administrador pode alterar o vencimento do token" }, { status: 403 });
    }
    data.venceEm = venceEm ? new Date(venceEm) : null;
  }
  if (ativo !== undefined) data.ativo = Boolean(ativo);

  const atualizada = await prisma.sinirConexao.update({
    where: { id: Number(id) },
    data,
    select: { id: true, nome: true, modo: true, ativo: true, token: true, venceEm: true },
  });

  return NextResponse.json({
    id: atualizada.id,
    nome: atualizada.nome,
    modo: atualizada.modo,
    ativo: atualizada.ativo,
    venceEm: atualizada.venceEm,
    temToken: !!atualizada.token,
  });
}