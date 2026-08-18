export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  ramoAtividade: string;
  enderecoRua: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  telefone: string;
  email: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
}

const CAMPOS_VAZIOS: Omit<DadosEmpresa, "logradouro" | "numero" | "complemento"> = {
  razaoSocial: "",
  nomeFantasia: "",
  ramoAtividade: "",
  enderecoRua: "",
  enderecoNumero: "",
  enderecoComplemento: "",
  bairro: "",
  cep: "",
  municipio: "",
  uf: "",
  telefone: "",
  email: "",
};

function formatarTelefone(ddd: string, numero: string) {
  if (!ddd && !numero) return "";
  return `(${ddd}) ${numero}`;
}

interface FonteCnpj {
  razaoSocial: string;
  nomeFantasia: string;
  ramoAtividade: string;
  enderecoRua: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  telefone: string;
  email: string;
}

async function tentarBrasilApi(cnpj: string): Promise<FonteCnpj | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.razao_social) return null;

  const telefone = data.ddd_telefone_1
    ? formatarTelefone(data.ddd_telefone_1.slice(0, 2), data.ddd_telefone_1.slice(2))
    : "";

  return {
    razaoSocial: data.razao_social || "",
    nomeFantasia: data.nome_fantasia || "",
    ramoAtividade: data.cnae_fiscal_descricao || "",
    enderecoRua: data.logradouro || "",
    enderecoNumero: data.numero || "",
    enderecoComplemento: data.complemento || "",
    bairro: data.bairro || "",
    cep: data.cep || "",
    municipio: data.municipio || "",
    uf: data.uf || "",
    telefone,
    email: data.email || "",
  };
}

async function tentarMinhaReceita(cnpj: string): Promise<FonteCnpj | null> {
  const res = await fetch(`https://minhareceita.org/${cnpj}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.razao_social) return null;

  const telefone = data.ddd_telefone_1
    ? formatarTelefone(data.ddd_telefone_1.slice(0, 2), data.ddd_telefone_1.slice(2))
    : "";

  return {
    razaoSocial: data.razao_social || "",
    nomeFantasia: data.nome_fantasia || "",
    ramoAtividade: data.cnae_fiscal_descricao || "",
    enderecoRua: data.logradouro || "",
    enderecoNumero: data.numero || "",
    enderecoComplemento: data.complemento || "",
    bairro: data.bairro || "",
    cep: data.cep || "",
    municipio: data.municipio || "",
    uf: data.uf || "",
    telefone,
    email: data.email || "",
  };
}

async function tentarReceitaWs(cnpj: string): Promise<FonteCnpj | null> {
  const res = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.status === "ERROR" || !data.nome) return null;

  return {
    razaoSocial: data.nome || "",
    nomeFantasia: data.fantasia || "",
    ramoAtividade: data.atividade_principal?.[0]?.text || "",
    enderecoRua: data.logradouro || "",
    enderecoNumero: data.numero || "",
    enderecoComplemento: data.complemento || "",
    bairro: data.bairro || "",
    cep: data.cep || "",
    municipio: data.municipio || "",
    uf: data.uf || "",
    telefone: (data.telefone || "").split("/")[0].trim(),
    email: data.email || "",
  };
}

export async function consultarCnpj(cnpj: string): Promise<DadosEmpresa | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) return null;

  const fontes = [tentarBrasilApi, tentarMinhaReceita, tentarReceitaWs];
  const resultados: (FonteCnpj | null)[] = await Promise.all(
    fontes.map((fonte) => fonte(cnpjLimpo).catch(() => null))
  );

  const encontrouAlguma = resultados.some(Boolean);
  if (!encontrouAlguma) return null;

  const combinado: DadosEmpresa = {
    ...CAMPOS_VAZIOS,
    logradouro: "",
    numero: "",
    complemento: "",
  };
  const campos = [
    "razaoSocial",
    "nomeFantasia",
    "ramoAtividade",
    "enderecoRua",
    "enderecoNumero",
    "enderecoComplemento",
    "bairro",
    "cep",
    "municipio",
    "uf",
    "telefone",
    "email",
  ] as const;
  for (const campo of campos) {
    for (const resultado of resultados) {
      const valor = resultado?.[campo];
      if (valor) {
        combinado[campo] = valor;
        break;
      }
    }
  }
  combinado.logradouro = combinado.enderecoRua;
  combinado.numero = combinado.enderecoNumero;
  combinado.complemento = combinado.enderecoComplemento;

  return combinado;
}