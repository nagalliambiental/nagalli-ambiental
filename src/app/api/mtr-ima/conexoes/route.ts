import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listarConexoes, criarConexao, excluirConexao, MtrImaError } from "@/lib/mtr-ima";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const conexoes = await listarConexoes();
    return NextResponse.json(conexoes);
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao listar conexões";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const { nome, cnpj, cpf, senha, unidade, empreendimentoId } = body;
    if (!nome || !cnpj || !cpf || !senha) {
      return NextResponse.json({ error: "Nome, CNPJ, CPF e senha são obrigatórios" }, { status: 400 });
    }
    const conexao = await criarConexao({ nome, cnpj, cpf, senha, unidade, empreendimentoId });
    return NextResponse.json({ id: conexao.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao criar conexão";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");
    if (!ids) return NextResponse.json({ error: "Informe ids" }, { status: 400 });
    for (const id of ids.split(",").map(Number).filter(Boolean)) {
      await excluirConexao(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao excluir conexões";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
