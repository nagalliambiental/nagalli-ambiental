import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { atualizarConexao, excluirConexao, excluirManifestosConexao, MtrImaError } from "@/lib/mtr-ima";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const body = await req.json();
    const { nome, cnpj, cpf, senha, unidade, empreendimentoId, ativo } = body;
    const conexao = await atualizarConexao(numId, {
      ...(nome ? { nome } : {}),
      ...(cnpj ? { cnpj } : {}),
      ...(cpf ? { cpf } : {}),
      ...(senha ? { senha } : {}),
      ...(unidade !== undefined ? { unidade: unidade ? Number(unidade) : null } : {}),
      ...(empreendimentoId !== undefined ? { empreendimentoId: empreendimentoId ? Number(empreendimentoId) : null } : {}),
      ...(ativo !== undefined ? { ativo: Boolean(ativo) } : {}),
    });
    return NextResponse.json({ id: conexao.id });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao atualizar conexão";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const { searchParams } = new URL(req.url);
    const limpar = searchParams.get("limpar");
    if (limpar === "manifestos") {
      await excluirManifestosConexao(numId);
      return NextResponse.json({ ok: true });
    }
    await excluirConexao(numId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao excluir conexão";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
