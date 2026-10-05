export type ExtracaoPgrs = {
  formPatch: Record<string, unknown>;
  estabPatch: Record<string, unknown>;
};

const ROMANOS: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

const RE_ANEXO_LINHA = /^ANEXO\s+([IVX]+)\s*$/i;
const RE_DATA = /,\s*(?:\d{1,2}|_{1,4})\s+de\s+/i;
const RE_CHECK = /\(\s*(X)?\s*\)\s*Sim\s+\(\s*(X)?\s*\)\s*N[ãa]o/i;
const RE_CHECK_LOCAL = /\(\s*(X)?\s*\)\s*No local\s+\(\s*(X)?\s*\)\s*Terceirizado/i;

const PAPEIS: { re: RegExp; nome: string; cargo: string }[] = [
  {
    re: /^respons[áa]vel (?:pelo|do) empreendimento/i,
    nome: "respEmpreendimentoNome",
    cargo: "respEmpreendimentoCargo",
  },
  {
    re: /^respons[áa]vel pela implanta[çc][ãa]o/i,
    nome: "respImplantacaoNome",
    cargo: "respImplantacaoCargo",
  },
  {
    re: /^respons[áa]vel t[ée]cnic[oa] pela elabora[çc][ãa]o/i,
    nome: "respTecnicoNome",
    cargo: "respTecnicoCargo",
  },
];

const RE_ROTULO_CONHECIDO =
  /^(possui refeit|preparo das|refei|unidades|porte|n[°º] de funcion|ramo de atividade|dias de|hor[áa]rio|[áa]rea constru|raz[ãa]o social|nome fantasia|cnpj|indica[çc][ãa]o fiscal|telefone|tel\.|e-mail|endere|munic|dirigente|cargo|nome$|gera este|se assinalar|ponto de ger|res[íi]duos gerados|quantifica|forma de|coleta interna|empresa respons|empresa transporte|empresa disposi|observa|assinatura|respons[áa]vel)/i;

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function ehInicioSecao(l: string): boolean {
  const n = semAcento(l);
  return (
    n.startsWith("identificacao") ||
    n.startsWith("do empreendimento") ||
    n.startsWith("do responsavel") ||
    n.includes("manejo dos residuos") ||
    n.startsWith("treinamento") ||
    n.startsWith("cronograma") ||
    n.startsWith("observacoes") ||
    n === "responsaveis" ||
    n.includes("assinatura") ||
    n.includes("dados das empresas") ||
    n.includes("residuos perigosos") ||
    n.includes("residuos nao reciclaveis") ||
    n.includes("residuos reciclaveis") ||
    /^\d+\.\s/.test(n) ||
    n === "anexos" ||
    RE_DATA.test(l)
  );
}

function ehRotuloConhecido(l: string): boolean {
  return RE_ROTULO_CONHECIDO.test(l) || ehInicioSecao(l);
}

function prepararLinhas(texto: string): string[] {
  const brutas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
  const l: string[] = [];
  for (let i = 0; i < brutas.length; i++) {
    if (/^ANEXO$/i.test(brutas[i]) && i + 1 < brutas.length) {
      l.push(`ANEXO ${brutas[i + 1]}`);
      i++;
    } else {
      l.push(brutas[i]);
    }
  }
  return l;
}

function valorDoRotulo(l: string[], i: number): string {
  for (let j = i; j <= i + 1 && j < l.length; j++) {
    const linha = l[j];
    const c = linha.indexOf(":");
    if (c > 0 && !/\d/.test(linha.slice(0, c))) {
      const v = linha.slice(c + 1).trim();
      if (v) return v;
    }
  }
  const prox = l[i + 1];
  if (prox && !ehRotuloConhecido(prox)) return prox.trim();
  return "";
}

function extrairPapeis(l: string[], patch: Record<string, unknown>) {
  for (let i = 0; i < l.length; i++) {
    const papel = PAPEIS.find((p) => p.re.test(l[i]));
    if (!papel) continue;

    const linha = l[i];
    const doisPontos = linha.indexOf(":");
    let nome = "";
    let cursor = i + 1;

    if (doisPontos > 0) {
      const inline = linha.slice(doisPontos + 1).trim();
      if (inline) nome = inline;
    }

    if (!nome) {
      let encontrado = false;
      while (cursor < l.length) {
        const c = l[cursor];
        if (PAPEIS.some((p) => p.re.test(c)) || ehInicioSecao(c)) break;
        if (/^nome$/i.test(c)) {
          cursor++;
          continue;
        }
        if (/^cargo/i.test(c)) break;
        nome = c;
        cursor++;
        encontrado = true;
        break;
      }
      if (!encontrado) continue;
    }
    if (!nome) continue;

    let cargo = "";
    for (let j = cursor; j < l.length; j++) {
      const c = l[j];
      if (PAPEIS.some((p) => p.re.test(c)) || ehInicioSecao(c)) break;
      if (/^nome$/i.test(c)) continue;
      if (/^cargo$/i.test(c)) {
        const prox = l[j + 1];
        if (prox && !PAPEIS.some((p) => p.re.test(prox)) && !ehInicioSecao(prox)) {
          cargo = prox.replace(/^cargo\s*:\s*/i, "").trim();
        }
        break;
      }
      cargo = c.replace(/^cargo\s*:\s*/i, "").trim();
      break;
    }

    patch[papel.nome] = nome;
    patch[papel.cargo] = cargo;
  }
}

function extrairAnexos(l: string[], patch: Record<string, unknown>) {
  for (let i = 0; i < l.length; i++) {
    const m = l[i].match(RE_ANEXO_LINHA);
    if (!m) continue;
    const num = ROMANOS[m[1].toUpperCase()];
    if (!num || num > 8) continue;

    const desc = l[i + 1] || "";
    if (!desc || RE_ANEXO_LINHA.test(desc)) continue;

    const estado = l[i + 2] || "";
    let anexado: "SIM" | "NAO" | null = null;
    const cb = estado.match(RE_CHECK);
    if (cb) anexado = cb[1] === "X" ? "SIM" : "NAO";
    else if (/^(SIM|N[ãa]O)$/i.test(estado)) anexado = /^SIM/i.test(estado) ? "SIM" : "NAO";
    if (!anexado) continue;

    let justificativa = "";
    const prox = l[i + 3] || "";
    if (prox && !RE_ANEXO_LINHA.test(prox) && !ehInicioSecao(prox)) justificativa = prox;

    patch[`anexo${num}`] = { anexado, justificativa };
  }
}

function acharIndice(l: string[], re: RegExp, de = 0): number {
  for (let i = de; i < l.length; i++) if (re.test(semAcento(l[i]))) return i;
  return -1;
}

function extrairCapacitacao(l: string[], patch: Record<string, unknown>) {
  const iOferta = acharIndice(l, /oferta cursos/i);
  if (iOferta < 0) return;

  const fim = acharIndice(
    l,
    /^(?:\d+\.\s*)?cronograma de implantacao|^(?:\d+\.\s*)?observacoes gerais$|assinatura|^anexos$/,
    iOferta + 1
  );
  const limite = fim >= 0 ? fim : l.length;

  let oferta: boolean | null = null;
  for (let j = iOferta; j <= Math.min(iOferta + 2, l.length - 1); j++) {
    const cb = l[j].match(RE_CHECK);
    if (cb) {
      oferta = cb[1] === "X";
      break;
    }
  }
  if (oferta !== null) patch.capacitacaoOferta = oferta;

  const rotulos: [RegExp, string][] = [
    [/^Frequ[êe]ncia dos cursos:\s*(.*)$/i, "capacitacaoFrequencia"],
    [/^N[°º] de funcion[áa]rios treinados:\s*(.*)$/i, "capacitacaoNFuncionarios"],
    [/^Respons[áa]vel pela capacita[çc][ãa]o:\s*(.*)$/i, "capacitacaoResponsavel"],
    [/^Conselho de Classe\/?\s*n[°º]:\s*(.*)$/i, "capacitacaoConselhoRegistro"],
    [/^Conte[úu]dos abordados:\s*(.*)$/i, "capacitacaoConteudos"],
  ];

  for (let j = iOferta + 1; j < limite; j++) {
    for (const [re, chave] of rotulos) {
      if (chave in patch) continue;
      const m = l[j].match(re);
      if (m) patch[chave] = m[1].trim();
    }

    const mJust = l[j].match(/^Se marcar N[ãa]O, justifique:\s*(.*)$/i);
    if (mJust) {
      let v = mJust[1].trim();
      if (!v && oferta === false) {
        const prox = l[j + 1] || "";
        if (prox && !/^Se a empresa ofertar/i.test(prox) && !ehInicioSecao(prox)) v = prox;
      }
      patch.capacitacaoJustificativa = v;
    }
  }
}

function extrairCronograma(l: string[], patch: Record<string, unknown>) {
  const iCron = acharIndice(l, /^(?:\d+\.\s*)?cronograma de implantacao/);
  if (iCron < 0) return;

  const h1 = acharIndice(l, /acoes a serem realizadas/, iCron + 1);
  if (h1 < 0) return;
  const h2 = acharIndice(l, /prazo para iniciar as acoes/, h1 + 1);
  if (h2 < 0) return;
  const h3 = acharIndice(l, /prazo para finalizar as acoes/, h2 + 1);
  if (h3 < 0) return;

  const linhas: string[] = [];
  for (let i = h3 + 1; i < l.length; i++) {
    if (ehInicioSecao(l[i])) break;
    linhas.push(l[i]);
  }

  const cronograma: { acao: string; prazoInicio: string; prazoFim: string }[] = [];
  for (let i = 0; i < linhas.length; i += 3) {
    const bloco = linhas.slice(i, i + 3);
    if (bloco.every((v) => !v)) continue;
    cronograma.push({
      acao: bloco[0] || "",
      prazoInicio: bloco[1] || "",
      prazoFim: bloco[2] || "",
    });
  }
  if (cronograma.length) patch.cronograma = cronograma;
}

function extrairObservacoes(l: string[], patch: Record<string, unknown>) {
  const iObs = acharIndice(l, /^(?:\d+\.\s*)?observacoes gerais$/);
  if (iObs < 0) return;

  const vals: string[] = [];
  for (let i = iObs + 1; i < l.length; i++) {
    const n = semAcento(l[i]);
    if (n === "responsaveis" || n.includes("assinatura") || n === "anexos" || RE_DATA.test(l[i])) {
      break;
    }
    vals.push(l[i]);
  }
  if (vals.length) patch.observacoesGerais = vals.join("\n");
}

function fimSecaoResiduos(l: string[], inicio: number): number {
  for (let i = inicio + 1; i < l.length; i++) {
    const n = semAcento(l[i]);
    if (
      n.includes("residuos perigosos") ||
      n.includes("residuos nao reciclaveis") ||
      n.includes("residuos reciclaveis") ||
      n.includes("dados das empresas") ||
      n.includes("treinamento de pessoal") ||
      n.includes("observacoes gerais") ||
      n.includes("cronograma de implantacao")
    ) {
      return i;
    }
  }
  return l.length;
}

function extrairResiduos(l: string[], patch: Record<string, unknown>) {
  const secoes: { re: RegExp; chave: string; campos: number }[] = [
    { re: /^(?:[a-c]\)\s*)?residuos perigosos/, chave: "residuosPerigosos", campos: 8 },
    { re: /^(?:[a-c]\)\s*)?residuos nao reciclaveis/, chave: "residuosNaoReciclaveis", campos: 7 },
    { re: /^(?:[a-c]\)\s*)?residuos reciclaveis/, chave: "residuosReciclaveis", campos: 8 },
  ];

  for (const sec of secoes) {
    const ini = acharIndice(l, sec.re);
    if (ini < 0) continue;
    const fim = fimSecaoResiduos(l, ini);

    let disp = -1;
    for (let i = ini + 1; i < fim; i++) {
      if (/disposi[çc][ãa]o final/i.test(l[i])) disp = i;
    }
    if (disp < 0) continue;

    const dados: string[] = [];
    for (let i = disp + 1; i < fim; i++) {
      if (/^obs\.\s*/i.test(l[i]) || /^as licen[çc]as/i.test(l[i])) break;
      dados.push(l[i]);
    }
    while (dados.length && (/^obs\.\s*/i.test(dados[dados.length - 1]) || ehInicioSecao(dados[dados.length - 1]))) {
      dados.pop();
    }
    if (!dados.length) continue;

    const itens: Record<string, string>[] = [];
    for (let i = 0; i < dados.length; i += sec.campos) {
      const b = dados.slice(i, i + sec.campos);
      if (b.every((v) => !v)) continue;
      if (sec.campos === 7) {
        itens.push({
          pontoGeracao: b[0] || "",
          residuosGerados: b[1] || "",
          quantificacao: b[2] || "",
          acondicionamento: b[3] || "",
          armazenamento: b[4] || "",
          coletaInterna: "",
          empresaTransporte: b[5] || "",
          empresaDisposicaoFinal: b[6] || "",
        });
      } else {
        itens.push({
          pontoGeracao: b[0] || "",
          residuosGerados: b[1] || "",
          quantificacao: b[2] || "",
          acondicionamento: b[3] || "",
          armazenamento: b[4] || "",
          coletaInterna: b[5] || "",
          empresaTransporte: b[6] || "",
          empresaDisposicaoFinal: b[7] || "",
        });
      }
    }
    if (itens.length) patch[sec.chave] = itens;
  }
}

function extrairEmpresas(l: string[], patch: Record<string, unknown>) {
  const ini = acharIndice(l, /^(?:\d+\.\s*)?dados das empresas contratadas/);
  if (ini < 0) return;

  let fim = l.length;
  for (let i = ini + 1; i < l.length; i++) {
    const n = semAcento(l[i]);
    if (
      n.startsWith("as licencas") ||
      /^obs\.:/i.test(l[i]) ||
      n.includes("treinamento de pessoal") ||
      n.includes("observacoes gerais") ||
      n.includes("assinatura") ||
      RE_DATA.test(l[i])
    ) {
      fim = i;
      break;
    }
  }

  const rows: string[] = [];
  for (let i = ini + 1; i < fim; i++) {
    const v = l[i];
    if (
      /^Nome fantasia$/i.test(v) ||
      /^Raz[ãa]o social$/i.test(v) ||
      /^CNPJ$/i.test(v) ||
      /^N[ÚU]MERO E DATA DE VALIDADE/i.test(v)
    ) {
      continue;
    }
    rows.push(v);
  }

  const empresas: Record<string, string>[] = [];
  for (let i = 0; i < rows.length; i += 4) {
    const b = rows.slice(i, i + 4);
    if (b.every((v) => !v)) continue;
    empresas.push({
      nomeFantasia: b[0] || "",
      razaoSocial: b[1] || "",
      cnpj: b[2] || "",
      numeroDataValidadeLicenca: b[3] || "",
    });
  }
  if (empresas.length) patch.empresasContratadas = empresas;
}

function extrairAssinatura(l: string[], patch: Record<string, unknown>) {
  const ini = acharIndice(l, /assinatura do respons[áa]vel/i);
  if (ini < 0) return;

  let fim = l.length;
  for (let i = ini + 1; i < l.length; i++) {
    if (RE_DATA.test(l[i]) || semAcento(l[i]) === "anexos") {
      fim = i;
      break;
    }
  }

  const vals = l
    .slice(ini + 1, fim)
    .filter((v) => !/^(NOME|CARGO|ASSINATURA|RESPONS[ÁA]VEL PELO EMPREENDIMENTO)$/i.test(v));

  if (vals.length >= 1) patch.responsavelAssinaturaNome = vals[0];
  if (vals.length >= 2) patch.responsavelAssinaturaCargo = vals[1];
}

function extrairEstabelecimento(l: string[], patch: Record<string, unknown>) {
  const ini = acharIndice(l, /^(?:\d+\.\s*)?identificacao(?:\s|$)/);
  if (ini < 0) return;

  let fim = l.length;
  for (let i = ini + 1; i < l.length; i++) {
    const n = semAcento(l[i]);
    if (
      n.includes("manejo dos residuos") ||
      n.includes("treinamento de pessoal") ||
      n.includes("residuos perigosos") ||
      n.includes("residuos nao reciclaveis") ||
      n.includes("residuos reciclaveis")
    ) {
      fim = i;
      break;
    }
  }
  const reg = l.slice(ini + 1, fim);

  const iRamo = acharIndice(reg, /ramo de atividade e descri/i);
  if (iRamo >= 0) {
    const v = valorDoRotulo(reg, iRamo);
    if (v) patch.ramoAtividade = v;
  }

  const iDias = acharIndice(reg, /dias de/i);
  if (iDias >= 0) {
    const v = valorDoRotulo(reg, iDias);
    if (v) patch.diasFuncionamento = v;
  }

  const iHor = acharIndice(reg, /hor[áa]rios? de/i);
  if (iHor >= 0) {
    const v = valorDoRotulo(reg, iHor);
    if (v) patch.horariosFuncionamento = v;
  }

  let iPorte = acharIndice(reg, /porte\s*\/\s*n[°º] de colaboradores/i);
  if (iPorte < 0) iPorte = acharIndice(reg, /^n[°º] de funcion[áa]rios(?! treinados)/i);
  if (iPorte >= 0) {
    const v = valorDoRotulo(reg, iPorte);
    if (/^\d+$/.test(v)) patch.porteColaboradores = v;
  }

  const iArea = acharIndice(reg, /[áa]rea constru[íi]da/i);
  if (iArea >= 0) {
    const m = valorDoRotulo(reg, iArea).match(/\d+(?:[.,]\d+)?/);
    if (m) patch.areaConstruida = m[0];
  }

  const iRef = acharIndice(reg, /refei[çc][õo]es di[áa]rias/i);
  if (iRef >= 0) {
    const m = reg[iRef].match(/refei[çc][õo]es di[áa]rias[^0-9]*(\d+)/i);
    if (m) patch.refeicoesDiarias = m[1];
  }

  const iUni = acharIndice(reg, /unidades\s*\/?\s*dia/i);
  if (iUni >= 0) {
    const m = reg[iUni].match(/unidades\s*\/?\s*dia\s*:?\s*(\d+)/i);
    if (m) patch.unidadesDia = m[1];
  }

  const iPossui = acharIndice(reg, /possui refeit[óo]rio/i);
  if (iPossui >= 0) {
    for (let j = iPossui; j <= Math.min(iPossui + 2, reg.length - 1); j++) {
      const cb = reg[j].match(RE_CHECK);
      if (cb) {
        patch.possuiRefeitorio = cb[1] === "X";
        break;
      }
    }
  }

  const iPreparo = acharIndice(reg, /preparo das refei[çc][õo]es/i);
  if (iPreparo >= 0) {
    for (let j = iPreparo; j <= Math.min(iPreparo + 2, reg.length - 1); j++) {
      const cb = reg[j].match(RE_CHECK_LOCAL);
      if (cb) {
        patch.preparoRefeicoes = cb[1] === "X" ? "NO_LOCAL" : "TERCEIRIZADO";
        break;
      }
    }
  }
}

export function extrairPgrsDoTexto(texto: string): ExtracaoPgrs {
  const l = prepararLinhas(texto);
  const formPatch: Record<string, unknown> = {};
  const estabPatch: Record<string, unknown> = {};

  extrairAnexos(l, formPatch);
  extrairCapacitacao(l, formPatch);
  extrairCronograma(l, formPatch);
  extrairObservacoes(l, formPatch);
  extrairResiduos(l, formPatch);
  extrairEmpresas(l, formPatch);
  extrairAssinatura(l, formPatch);
  extrairPapeis(l, formPatch);
  extrairEstabelecimento(l, estabPatch);

  return { formPatch, estabPatch };
}
