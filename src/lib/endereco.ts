export interface DadosEndereco {
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}

export function formatarEndereco(endereco: DadosEndereco): string[] {
  const linhas: string[] = [];

  const rua = String(endereco.rua ?? "").trim();
  const numero = String(endereco.numero ?? "").trim();
  if (rua) {
    linhas.push(numero && numero !== "0" && numero !== "S/N" ? `${rua}, ${numero}` : rua);
  }

  const complemento = String(endereco.complemento ?? "").trim();
  if (complemento) linhas.push(complemento);

  const bairro = String(endereco.bairro ?? "").trim();
  if (bairro) linhas.push(bairro);

  const municipio = String(endereco.municipio ?? "").trim();
  const uf = String(endereco.uf ?? "").trim();
  if (municipio && uf) linhas.push(`${municipio} - ${uf}`);
  else if (municipio) linhas.push(municipio);
  else if (uf) linhas.push(uf);

  const cep = String(endereco.cep ?? "").trim();
  if (cep) linhas.push(`CEP: ${cep}`);

  return linhas;
}