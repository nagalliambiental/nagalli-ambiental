import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { PRIORIDADE_TAREFA, STATUS_TAREFA } from "@/lib/constants";
import { notificarTarefaNova } from "@/lib/notificacoes";

export const TAREFAS_IMPORT_MAX = 2000;

const CABECALHOS = [
  "Título",
  "Descrição",
  "Responsável",
  "Empreendimento",
  "Licença",
  "Prazo Final",
  "Alerta (dias)",
  "Prioridade",
];

const MESES: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

function normalizar(v: unknown): string {
  return String(v ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function emMeioDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

function parseData(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return emMeioDia(v);

  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!Number.isNaN(d.getTime())) return emMeioDia(d);
  }

  const s = String(v ?? "").trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);

  const br = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
  if (br) {
    let ano = Number(br[3]);
    if (ano < 100) ano += 2000;
    const d = new Date(ano, Number(br[2]) - 1, Number(br[1]), 12);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const ext = normalizar(s).match(/^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (ext && MESES[ext[2]] !== undefined) {
    const ano = ext[3] ? Number(ext[3]) : new Date().getFullYear();
    return new Date(ano, MESES[ext[2]], Number(ext[1]), 12);
  }

  return null;
}

function prioridadeValida(v: unknown): string {
  const p = normalizar(v);
  if (p === "urgente") return PRIORIDADE_TAREFA.URGENTE;
  if (p === "alta" || p === "alta ") return PRIORIDADE_TAREFA.ALTA;
  if (p === "baixa") return PRIORIDADE_TAREFA.BAIXA;
  return PRIORIDADE_TAREFA.MEDIA;
}

function alertaValido(v: unknown): number {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  if (Number.isFinite(n) && n >= 0 && n <= 365) return Math.round(n);
  return 30;
}

export function gerarModeloTarefasXlsx(): Buffer {
  const aoa: unknown[][] = [
    CABECALHOS,
    [
      "Apresentar RAL anual",
      "Enviar Relatório Anual de Atividades ao órgão ambiental",
      "Bruno Nagalli",
      "",
      "",
      "15/08/2026",
      30,
      "alta",
    ],
    [
      "Renovar alvará",
      "Protocolar renovação antes do vencimento",
      "",
      "",
      "",
      "",
      60,
      "media",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = CABECALHOS.map((h) => ({ wch: Math.max(14, Math.min(48, h.length + 8)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tarefas");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export interface LinhaImportacao {
  numero: number;
  titulo: string;
  descricao: string | null;
  responsavelId: number | null;
  empreendimentoId: number | null;
  processoId: number | null;
  prazoFinal: Date | null;
  alertaPrazoFinal: number;
  prioridade: string;
  observacao: string | null;
}

export interface ResultadoImportacao {
  importId: string;
  criadas: number;
  exigenciasCriadas: number;
  linhas: LinhaImportacao[];
  erros: string[];
}

function mapearCabecalhos(header: unknown[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  header.forEach((h, i) => {
    const chave = normalizar(h).replace(/\s+/g, " ");
    if (chave) mapa[chave] = i;
  });
  return mapa;
}

function coluna(mapa: Record<string, number>, ...nomes: string[]): number | undefined {
  for (const n of nomes) {
    const idx = mapa[normalizar(n)];
    if (idx !== undefined) return idx;
  }
  return undefined;
}

function valor(linha: unknown[], idx: number | undefined): string {
  if (idx === undefined) return "";
  const v = linha[idx];
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").trim();
}

export async function importarTarefasXlsx(
  buffer: Buffer,
  usuarioId: number
): Promise<ResultadoImportacao> {
  const importId = crypto.randomUUID();
  const erros: string[] = [];

  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const nomeSheet = wb.SheetNames[0];
  if (!nomeSheet) {
    return { importId, criadas: 0, exigenciasCriadas: 0, linhas: [], erros: ["Planilha vazia."] };
  }

  const ws = wb.Sheets[nomeSheet];
  const bruto = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true, blankrows: false });
  if (bruto.length < 2) {
    return {
      importId,
      criadas: 0,
      exigenciasCriadas: 0,
      linhas: [],
      erros: ["Planilha sem dados. Use o modelo baixado pelo botão 'Modelo XLSX'."],
    };
  }

  const mapa = mapearCabecalhos(bruto[0]);
  const iTitulo = coluna(mapa, "Título", "Titulo");
  if (iTitulo === undefined) {
    return {
      importId,
      criadas: 0,
      exigenciasCriadas: 0,
      linhas: [],
      erros: ['Coluna "Título" não encontrada. Use o modelo baixado pelo botão "Modelo XLSX".'],
    };
  }

  const iDescricao = coluna(mapa, "Descrição", "Descricao");
  const iResponsavel = coluna(mapa, "Responsável", "Responsavel");
  const iEmpreendimento = coluna(mapa, "Empreendimento");
  const iProcesso = coluna(mapa, "Licença", "Nº Licença", "Numero da Licenca", "Processo", "Nº Processo", "Numero do Processo");
  const iPrazo = coluna(mapa, "Prazo Final", "Prazo", "Data Limite");
  const iAlerta = coluna(mapa, "Alerta (dias)", "Alerta", "Alerta Prazo Final");
  const iPrioridade = coluna(mapa, "Prioridade");

  const linhas: LinhaImportacao[] = [];

  for (let r = 1; r < bruto.length && linhas.length < TAREFAS_IMPORT_MAX; r++) {
    const linha = bruto[r];
    if (!Array.isArray(linha)) continue;

    const titulo = valor(linha, iTitulo);
    if (!titulo) continue;
    if (titulo.length > 300) {
      erros.push(`Linha ${r + 1}: título acima de 300 caracteres (ignorada).`);
      continue;
    }

    const respNome = valor(linha, iResponsavel);
    let responsavelId: number | null = null;
    if (respNome) {
      const resp = await prisma.responsavel.findFirst({
        where: { nome: { equals: respNome, mode: "insensitive" } },
        select: { id: true },
      });
      if (!resp) {
        erros.push(`Linha ${r + 1}: responsável "${respNome}" não encontrado (ignorada).`);
        continue;
      }
      responsavelId = resp.id;
    }

    const empNome = valor(linha, iEmpreendimento);
    let empreendimentoId: number | null = null;
    if (empNome) {
      const emp = await prisma.empreendimento.findFirst({
        where: { apelido: { equals: empNome, mode: "insensitive" } },
        select: { id: true },
      });
      if (!emp) {
        erros.push(`Linha ${r + 1}: empreendimento "${empNome}" não encontrado (ignorada).`);
        continue;
      }
      empreendimentoId = emp.id;
    }

    const procNum = valor(linha, iProcesso);
    let processoId: number | null = null;
    if (procNum) {
      const proc = await prisma.processo.findFirst({
        where: {
          AND: [
            {
              OR: [
                { numProtocolo: { equals: procNum, mode: "insensitive" } },
                { numLicenca: { equals: procNum, mode: "insensitive" } },
              ],
            },
            ...(empreendimentoId ? [{ empreendimentoId }] : []),
          ],
        },
        select: { id: true },
      });
      if (!proc) {
        erros.push(`Linha ${r + 1}: licença "${procNum}" não encontrada (ignorada).`);
        continue;
      }
      processoId = proc.id;
    }

    const prazoFinal = parseData(valor(linha, iPrazo)) ?? parseData(linha[iPrazo ?? -1]);

    linhas.push({
      numero: r + 1,
      titulo,
      descricao: valor(linha, iDescricao) || null,
      responsavelId,
      empreendimentoId,
      processoId,
      prazoFinal,
      alertaPrazoFinal: alertaValido(valor(linha, iAlerta) || (iAlerta === undefined ? "" : linha[iAlerta])),
      prioridade: prioridadeValida(valor(linha, iPrioridade)),
      observacao: null,
    });
  }

  if (linhas.length === 0 && erros.length === 0) {
    erros.push("Nenhuma linha válida encontrada na planilha.");
  }

  let criadas = 0;
  let exigenciasCriadas = 0;

  if (linhas.length > 0) {
    for (const l of linhas) {
      let exigenciaId: number | null = null;
      if (l.processoId) {
        const prazo =
          l.prazoFinal ??
          new Date(Date.now() + l.alertaPrazoFinal * 86400000);
        const exig = await prisma.exigencia.create({
          data: {
            descricao: l.descricao ? `${l.titulo} — ${l.descricao}` : l.titulo,
            prazo,
            antecedenciaDias: l.alertaPrazoFinal,
            processoId: l.processoId,
          },
          select: { id: true },
        });
        exigenciaId = exig.id;
        exigenciasCriadas++;
      }

      const responsavelId = l.responsavelId ?? (await garantirResponsavelPadrao(erros, l));
      const nova = await prisma.tarefa.create({
        data: {
          titulo: l.titulo,
          descricao: l.descricao,
          status: STATUS_TAREFA.NAO_INICIADO,
          prioridade: l.prioridade,
          prazoFinal: l.prazoFinal,
          alertaPrazoFinal: l.alertaPrazoFinal,
          responsavelId,
          empreendimentoId: l.empreendimentoId,
          processoId: l.processoId,
          exigenciaId,
          usuarioId,
          importId,
        },
        select: { id: true },
      });
      await notificarTarefaNova({ id: nova.id, titulo: l.titulo, responsavelId, criadoPorUsuarioId: usuarioId });
      criadas++;
    }
  }

  return { importId, criadas, exigenciasCriadas, linhas, erros };
}

async function garantirResponsavelPadrao(erros: string[], l: LinhaImportacao): Promise<number> {
  const existente = await prisma.responsavel.findFirst({ select: { id: true } });
  if (existente) return existente.id;
  erros.push(`Linha ${l.numero}: sem responsável definido; foi usado o primeiro responsável cadastrado.`);
  const criado = await prisma.responsavel.create({
    data: { nome: "A definir", email: "definir@nagalli.local", funcao: "Não definida" },
    select: { id: true },
  });
  return criado.id;
}
