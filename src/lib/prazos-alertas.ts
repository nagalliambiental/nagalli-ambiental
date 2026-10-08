import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

/** Janela fixa de alerta de TPP (AutorizacaoTpp não tem alertaDias). */
const JANELA_TPP_DIAS = 30;
/** Exigências entram no alerta com até 7 dias (mesma regra da página de Prazos). */
const JANELA_EXIGENCIA_DIAS = 7;
/** Não notifica itens vencidos há mais de 30 dias (evita inundar o sino na 1ª execução). */
const LIMITE_VENCIDO_DIAS = 30;

/**
 * Notificação de vencimento é criada UMA única vez por (tipo, mensagem).
 * Diferente do dedupe de notificacoes.ts, vale para notificações já lidas —
 * a mensagem é estável (usa a data, não a contagem de dias), então não repete
 * todo dia enquanto o item estiver na janela de alerta.
 */
async function jaNotificada(tipo: string, mensagem: string): Promise<boolean> {
  const ja = await prisma.notificacao.findFirst({
    where: { tipo, mensagem },
    select: { id: true },
  });
  return !!ja;
}

async function notificar(params: {
  tipo: string;
  mensagem: string;
  url: string;
}): Promise<boolean> {
  if (await jaNotificada(params.tipo, params.mensagem)) return false;
  await prisma.notificacao.create({
    data: { tipo: params.tipo, mensagem: params.mensagem, url: params.url },
  });
  return true;
}

function dataCurta(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Percorre licenças (processos), PGRS, TPP e exigências e cria notificações
 * no sino para os itens que entram/estão na janela de alerta ou venceram
 * recentemente. Executada pelo cron diário (/api/cron/diario).
 */
export async function gerarAlertasDeVencimento(): Promise<{ criados: number; verificados: number }> {
  const hoje = new Date();
  let criados = 0;
  let verificados = 0;

  const adicionar = async (p: { tipo: string; mensagem: string; url: string }) => {
    verificados++;
    if (await notificar(p)) criados++;
  };

  // --- Licenças (processos com validade) ---
  const processos = await prisma.processo.findMany({
    where: { validade: { not: null }, renovacaoPendente: false },
    select: {
      id: true,
      numProtocolo: true,
      numLicenca: true,
      tipo: true,
      validade: true,
      alertaDias: true,
      empreendimento: { select: { apelido: true } },
    },
  });
  for (const p of processos) {
    const dias = differenceInDays(p.validade!, hoje);
    if (dias > p.alertaDias || dias < -LIMITE_VENCIDO_DIAS) continue;
    const rotulo = p.numLicenca || p.numProtocolo;
    const verbo = dias < 0 ? "venceu em" : "vence em";
    await adicionar({
      tipo: "vencimento_licenca",
      mensagem: `Licença ${rotulo} (${p.tipo}) — ${p.empreendimento.apelido} ${verbo} ${dataCurta(p.validade!)}`,
      url: `/processos/${p.id}`,
    });
  }

  // --- PGRS ---
  const pgrs = await prisma.pgrs.findMany({
    where: { ativo: true, validade: { not: null } },
    select: {
      id: true,
      numero: true,
      validade: true,
      alertaDias: true,
      empreendimento: { select: { apelido: true } },
    },
  });
  for (const p of pgrs) {
    const dias = differenceInDays(p.validade!, hoje);
    if (dias > p.alertaDias || dias < -LIMITE_VENCIDO_DIAS) continue;
    const rotulo = p.numero || p.empreendimento.apelido;
    const verbo = dias < 0 ? "venceu em" : "vence em";
    await adicionar({
      tipo: "vencimento_pgrs",
      mensagem: `PGRS ${rotulo} — ${p.empreendimento.apelido} ${verbo} ${dataCurta(p.validade!)}`,
      url: `/pgrs/${p.id}`,
    });
  }

  // --- TPP ---
  const tpps = await prisma.autorizacaoTpp.findMany({
    where: { ativo: true },
    select: {
      id: true,
      numero: true,
      dataValidade: true,
      cliente: { select: { apelido: true } },
    },
  });
  for (const t of tpps) {
    const dias = differenceInDays(t.dataValidade, hoje);
    if (dias > JANELA_TPP_DIAS || dias < -LIMITE_VENCIDO_DIAS) continue;
    const verbo = dias < 0 ? "venceu em" : "vence em";
    await adicionar({
      tipo: "vencimento_tpp",
      mensagem: `TPP ${t.numero} — ${t.cliente.apelido} ${verbo} ${dataCurta(t.dataValidade)}`,
      url: `/tpp`,
    });
  }

  // --- Exigências pendentes ---
  const exigencias = await prisma.exigencia.findMany({
    where: { cumprida: false },
    select: {
      id: true,
      descricao: true,
      prazo: true,
      processo: {
        select: {
          id: true,
          numProtocolo: true,
          numLicenca: true,
          empreendimento: { select: { apelido: true } },
        },
      },
    },
  });
  for (const e of exigencias) {
    const dias = differenceInDays(e.prazo, hoje);
    if (dias > JANELA_EXIGENCIA_DIAS || dias < -LIMITE_VENCIDO_DIAS) continue;
    const descricao = e.descricao.length > 60 ? `${e.descricao.slice(0, 60)}…` : e.descricao;
    const rotulo = e.processo.numLicenca || e.processo.numProtocolo;
    const verbo = dias < 0 ? "venceu em" : "vence em";
    await adicionar({
      tipo: "vencimento_exigencia",
      mensagem: `Exigência "${descricao}" — processo ${rotulo} ${verbo} ${dataCurta(e.prazo)}`,
      url: `/processos/${e.processo.id}`,
    });
  }

  return { criados, verificados };
}
