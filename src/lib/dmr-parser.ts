import * as XLSX from "xlsx";

export interface DmrRow {
  empresa: string;
  identificacao: string;
  unidade: string;
  responsavel: string;
  trimestres: {
    label: string;
    dmr: string;
    mtr: string;
  }[];
}

const TRIMESTRES = [
  { colDmr: 5, colMtr: 9, label: "1º trimestre (01/01 – 31/03)" },
  { colDmr: 6, colMtr: 10, label: "2º trimestre (01/04 – 30/06)" },
  { colDmr: 7, colMtr: 11, label: "3º trimestre (01/07 – 30/09)" },
  { colDmr: 8, colMtr: 12, label: "4º trimestre (01/10 – 31/12)" },
];

export function parseDmrSheet(buffer: ArrayBuffer): {
  ano: number;
  linhas: DmrRow[];
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets["DMR"];
  if (!ws) throw new Error("Aba 'DMR' não encontrada na planilha");

  const data = XLSX.utils.sheet_to_json<(string | undefined)[]>(ws, {
    header: 1,
    defval: "",
  }) as string[][];

  let ano = new Date().getFullYear();
  if (data[0]?.[8]) {
    const match = String(data[0][8]).match(/(\d{4})/);
    if (match) ano = Number(match[1]);
  }

  let ultimaEmpresa = "";
  const linhas: DmrRow[] = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;

    const empresa = (row[1] || "").trim() || ultimaEmpresa;
    if (empresa) ultimaEmpresa = empresa;
    if (!empresa) continue;

    const identificacao = (row[2] || "").trim();
    if (!identificacao) continue;

    const trimestres = TRIMESTRES.map((t) => ({
      label: t.label,
      dmr: (row[t.colDmr] || "").toString().trim(),
      mtr: (row[t.colMtr] || "").toString().trim(),
    }));

    linhas.push({
      empresa,
      identificacao,
      unidade: (row[3] || "").toString().trim(),
      responsavel: (row[4] || "").toString().trim(),
      trimestres,
    });
  }

  return { ano, linhas };
}

export function getTrimestreAtual(): {
  numero: number;
  label: string;
  inicio: string;
  fim: string;
} {
  const mes = new Date().getMonth();
  const trimestres = [
    { numero: 1, label: "1º trimestre", inicio: "01/01", fim: "31/03" },
    { numero: 2, label: "2º trimestre", inicio: "01/04", fim: "30/06" },
    { numero: 3, label: "3º trimestre", inicio: "01/07", fim: "30/09" },
    { numero: 4, label: "4º trimestre", inicio: "01/10", fim: "31/12" },
  ];
  return trimestres[Math.floor(mes / 3)] || trimestres[0];
}
