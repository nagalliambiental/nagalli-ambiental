import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { gerarPdfMtrsSalvosPorDestinador, trimestreCorrente } from "@/lib/sinir";
import { enviarEmail } from "@/lib/resend";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const conexaoId = Number(body.conexaoId);
  const contatoIds = Array.isArray(body.contatoIds) ? body.contatoIds.map(Number).filter((n: number) => Number.isFinite(n)) : [];

  if (!Number.isFinite(conexaoId)) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }
  if (contatoIds.length === 0) {
    return NextResponse.json({ error: "Selecione pelo menos um contato para enviar o e-mail" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({
    where: { id: conexaoId },
    include: { empreendimento: true },
  });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  const contatos = await prisma.contato.findMany({
    where: { id: { in: contatoIds }, ativo: true },
  });
  if (contatos.length === 0) {
    return NextResponse.json({ error: "Nenhum contato válido selecionado" }, { status: 400 });
  }

  const { inicio, fim, rotulo } = trimestreCorrente();

  const manifestos = await prisma.sinirManifesto.findMany({
    where: {
      conexaoId: conexao.id,
      status: "SALVO",
      dataExpedicao: { gte: inicio, lte: fim },
    },
    orderBy: [{ destinadorNome: "asc" }, { dataExpedicao: "asc" }],
    select: { numero: true, destinadorNome: true, dataExpedicao: true },
  });
  if (manifestos.length === 0) {
    return NextResponse.json(
      { error: `Nenhum MTR na situação Salvo com emissão dentro do ${rotulo} (${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}) — consulte o SINIR em Meus MTRs antes de notificar` },
      { status: 400 }
    );
  }

  const empreendimentoNome = conexao.empreendimento?.apelido || conexao.nome;
  const unidadeSinir = conexao.empreendimento?.unidadeSinir || conexao.unidade;

  const grupos = new Map<string, { numero: string; dataExpedicao: Date | null }[]>();
  for (const m of manifestos) {
    const chave = m.destinadorNome || "Destinador não identificado";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push({ numero: m.numero, dataExpedicao: m.dataExpedicao });
  }

  let secoesHtml = "";
  for (const [destinador, lista] of [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))) {
    const itens = lista
      .map(
        (m) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #e8e5dc;font-weight:bold;color:#1e2418;">MTR ${esc(m.numero)}</td>` +
          `<td style="padding:6px 12px;border-bottom:1px solid #e8e5dc;color:#3d4534;">${
            m.dataExpedicao ? `emitido em ${m.dataExpedicao.toLocaleDateString("pt-BR")}` : "data de emissão não registrada"
          }</td></tr>`
      )
      .join("");
    secoesHtml +=
      `<div style="margin:0 0 18px 0;">      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;letter-spacing:.04em;color:#36602c;text-transform:uppercase;">${esc(destinador)}</p>` +
      `<table style="width:100%;border-collapse:collapse;background:#faf9f4;border-radius:6px;font-size:13px;">${itens}</table></div>`;
  }

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f2f0ea;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#36602c;border-radius:10px 10px 0 0;padding:22px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:.02em;">NAGALLI AMBIENTAL</h1>
      <p style="margin:4px 0 0 0;color:#d7e3cf;font-size:12px;">Gestão de resíduos · Controle de MTR — SINIR Nacional</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 10px 10px;padding:26px 28px;">
      <h2 style="margin:0 0 10px 0;font-size:17px;color:#1e2418;">MTRs aguardando confirmação de recebimento</h2>
      <p style="margin:0 0 6px 0;font-size:14px;color:#3d4534;line-height:1.55;">Prezado(a) parceiro(a),</p>
      <p style="margin:0 0 14px 0;font-size:14px;color:#3d4534;line-height:1.55;">
        Os manifestos de transporte de resíduos listados abaixo, emitidos no período do <b>${esc(rotulo)}</b>
        (${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}), encontram-se na situação <b>"Salvo"</b> no portal SINIR,
        aguardando a confirmação de recebimento pelo destinador. Solicitamos que as empresas responsáveis acessem o sistema
        e regularizem os recebimentos.
      </p>
      <p style="margin:0 0 18px 0;font-size:13px;color:#5b6353;">
        Empreendimento: <b>${esc(empreendimentoNome)}</b>${unidadeSinir ? ` &nbsp;·&nbsp; Unidade SINIR: <b>${esc(unidadeSinir)}</b>` : ""} &nbsp;·&nbsp; Total: <b>${manifestos.length} MTR(s)</b>
      </p>
      ${secoesHtml}
      <p style="margin:0 0 4px 0;font-size:12px;color:#5b6353;line-height:1.5;">
        Em anexo, versão em PDF deste relatório para arquivamento e divulgação interna.
      </p>
      <hr style="border:none;border-top:1px solid #e8e5dc;margin:18px 0;" />
      <p style="margin:0;font-size:11px;color:#8a907e;line-height:1.5;">
        E-mail automático gerado pelo sistema Nagalli Ambiental em ${new Date().toLocaleString("pt-BR")}.
        Não responda esta mensagem — em caso de dúvidas, entre em contato com nossa equipe técnica.
      </p>
    </div>
  </div>
</body></html>`;

  const pdf = await gerarPdfMtrsSalvosPorDestinador(empreendimentoNome, unidadeSinir, manifestos, rotulo);

  try {
    const resultado = await enviarEmail({
      to: contatos.map((c) => c.email),
      subject: `[Nagalli Ambiental] MTRs aguardando recebimento no SINIR — ${rotulo} — ${empreendimentoNome}`,
      html,
      anexos: [{ filename: pdf.nomeArquivo, content: Buffer.from(pdf.buffer) }],
    });

    await logAuditoria(
      "CRIAR",
      "SinirNotificacao",
      conexao.id,
      {
        acao: "notificar-salvos",
        conexao: conexao.nome,
        empreendimento: empreendimentoNome,
        destinatarios: contatos.map((c) => c.email),
        mtrs: manifestos.length,
        destinadores: grupos.size,
        resendId: resultado.id,
      },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json({
      ok: true,
      enviados: contatos.length,
      mtrs: manifestos.length,
      destinadores: grupos.size,
      destinatarios: contatos.map((c) => ({ nome: c.nome, email: c.email })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao enviar o e-mail" },
      { status: 502 }
    );
  }
}
