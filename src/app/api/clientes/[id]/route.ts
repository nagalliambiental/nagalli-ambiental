import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
export const dynamic = "force-static";

export function generateStaticParams() { return []; }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
      include: {
        residuos: { orderBy: { ordem: "asc" } },
        residuosAnuais: { orderBy: { ordem: "asc" } },
        empresasContratadas: { orderBy: { ordem: "asc" } },
        documentosGerados: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { erro: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const scalarFields = [
      "apelido", "razaoSocial", "nomeFantasia", "cnpj",
      "rua", "numero", "bairro", "complemento", "cep", "municipio", "uf",
      "telefone", "email", "respLegal",
      "ramoAtividade", "indicacaoFiscal", "diasFuncionamento", "horariosFuncionamento",
      "areaConstruida", "porteColaboradores", "possuiRefeitorio",
      "refeicoesDiarias", "unidadesDia", "preparoRefeicoes",
      "dirigenteNome", "dirigenteCargo",
      "responsavelPgrsNome", "responsavelPgrsCargo",
      "latitude", "longitude", "inscricaoEstadual", "numeroColaboradores",
      "representanteLegalNome",
      "responsavelGestao1Nome", "responsavelGestao1Telefone", "responsavelGestao1Email",
      "responsavelGestao2Nome", "responsavelGestao2Telefone", "responsavelGestao2Email",
      "representanteLegalCpf",
      "responsavelTecnicoEstabelecimentoNome", "responsavelTecnicoEstabelecimentoEmail",
      "responsavelTecnicoEstabelecimentoOrgao", "responsavelTecnicoEstabelecimentoRegistro",
      "tipoServicosDescricao", "atendimentosDia",
      "responsavelElaboracaoNome", "responsavelElaboracaoCpf",
      "responsavelElaboracaoEndereco", "responsavelElaboracaoBairro",
      "responsavelElaboracaoEmail", "responsavelElaboracaoTelefone",
      "responsavelElaboracaoEmpresaNome", "responsavelElaboracaoEmpresaCnpj",
      "responsavelElaboracaoRegistroCrq",
    ];
    const data: Record<string, unknown> = {};
    for (const field of scalarFields) {
      if (field in body) data[field] = body[field];
    }

    if (!data.apelido || !data.razaoSocial || !data.cnpj || !data.telefone || !data.email || !data.respLegal) {
      return NextResponse.json(
        { erro: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data,
    });

    await logAuditoria(
      "ATUALIZAR",
      "Cliente",
      cliente.id,
      data,
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
    });

    if (!cliente) {
      return NextResponse.json(
        { erro: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const empreendimentoIds = (await prisma.empreendimento.findMany({
      where: { clienteId: Number(id) },
      select: { id: true },
    })).map((e) => e.id);

    const processoIds = (await prisma.processo.findMany({
      where: { empreendimentoId: { in: empreendimentoIds } },
      select: { id: true },
    })).map((p) => p.id);

    await prisma.$transaction([
      prisma.timelineProcesso.deleteMany({ where: { processoId: { in: processoIds } } }),
      prisma.documento.deleteMany({ where: { processoId: { in: processoIds } } }),
      prisma.exigencia.deleteMany({ where: { processoId: { in: processoIds } } }),
      prisma.processo.deleteMany({ where: { id: { in: processoIds } } }),
      prisma.empreendimento.deleteMany({ where: { id: { in: empreendimentoIds } } }),
      prisma.cliente.delete({ where: { id: Number(id) } }),
    ]);

    await logAuditoria(
      "EXCLUIR",
      "Cliente",
      Number(id),
      { apelido: cliente.apelido, razaoSocial: cliente.razaoSocial, cnpj: cliente.cnpj },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json({ mensagem: "Cliente excluído com sucesso" });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao excluir cliente" },
      { status: 500 }
    );
  }
}
