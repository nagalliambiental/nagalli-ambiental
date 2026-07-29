"use client";

import { ResiduoInput, EmpresaContratadaInput } from "@/lib/templates/pgrs-pinhais/config";

const inputClass =
  "focus-ring w-full rounded-lg border border-[var(--color-paper-200)] px-2 py-1.5 text-xs text-[var(--color-ink-900)]";

export function ResiduoTable({
  titulo,
  itens,
  comColetaInterna,
  onChange,
}: {
  titulo: string;
  itens: ResiduoInput[];
  comColetaInterna: boolean;
  onChange: (itens: ResiduoInput[]) => void;
}) {
  function updateItem(i: number, field: keyof ResiduoInput, value: string) {
    const next = [...itens];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }

  const cols: { key: keyof ResiduoInput; label: string }[] = [
    { key: "pontoGeracao", label: "Ponto de geração" },
    { key: "residuosGerados", label: "Resíduos gerados" },
    { key: "quantificacao", label: "Quantificação" },
    { key: "acondicionamento", label: "Acondicionamento" },
    { key: "armazenamento", label: "Armazenamento" },
    ...(comColetaInterna ? ([{ key: "coletaInterna", label: "Coleta interna" }] as const) : []),
    { key: "empresaTransporte", label: "Empresa transporte" },
    { key: "empresaDisposicaoFinal", label: "Empresa disposição final" },
  ];

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">{titulo}</h3>
      <div className="overflow-x-auto border border-[var(--color-paper-200)] rounded-[var(--radius-card)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--color-paper-50)]">
              {cols.map((c) => (
                <th key={c.key} className="p-2 text-left font-medium border-b">{c.label}</th>
              ))}
              <th className="border-b"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                {cols.map((c) => (
                  <td key={c.key} className="p-1">
                    <input
                      className={inputClass}
                      value={(item[c.key] as string) || ""}
                      onChange={(e) => updateItem(i, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-1">
                  {itens.length > 1 && (
                    <button type="button" onClick={() => onChange(itens.filter((_, idx) => idx !== i))} className="text-red-500 text-xs px-2">
                      remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange([...itens, { pontoGeracao: "", residuosGerados: "", quantificacao: "", acondicionamento: "", armazenamento: "", coletaInterna: "", empresaTransporte: "", empresaDisposicaoFinal: "" }])}
        className="text-xs text-[var(--color-brand-600)] hover:underline"
      >
        + adicionar item
      </button>
    </div>
  );
}

export function EmpresasContratadasTable({
  itens,
  onChange,
}: {
  itens: EmpresaContratadaInput[];
  onChange: (itens: EmpresaContratadaInput[]) => void;
}) {
  function updateItem(i: number, field: keyof EmpresaContratadaInput, value: string) {
    const next = [...itens];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }

  const cols: { key: keyof EmpresaContratadaInput; label: string }[] = [
    { key: "nomeFantasia", label: "Nome fantasia" },
    { key: "razaoSocial", label: "Razão social" },
    { key: "cnpj", label: "CNPJ" },
    { key: "numeroDataValidadeLicenca", label: "Nº e validade da licença" },
  ];

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-[var(--color-paper-200)] rounded-[var(--radius-card)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--color-paper-50)]">
              {cols.map((c) => (
                <th key={c.key} className="p-2 text-left font-medium border-b">{c.label}</th>
              ))}
              <th className="border-b"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                {cols.map((c) => (
                  <td key={c.key} className="p-1">
                    <input className={inputClass} value={item[c.key] || ""} onChange={(e) => updateItem(i, c.key, e.target.value)} />
                  </td>
                ))}
                <td className="p-1">
                  {itens.length > 1 && (
                    <button type="button" onClick={() => onChange(itens.filter((_, idx) => idx !== i))} className="text-red-500 text-xs px-2">
                      remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange([...itens, { nomeFantasia: "", razaoSocial: "", cnpj: "", numeroDataValidadeLicenca: "" }])}
        className="text-xs text-[var(--color-brand-600)] hover:underline"
      >
        + adicionar empresa
      </button>
    </div>
  );
}

export function AnexoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { anexado: "SIM" | "NAO"; justificativa?: string };
  onChange: (v: { anexado: "SIM" | "NAO"; justificativa?: string }) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_2fr] gap-3 items-center border-b border-[var(--color-paper-200)] py-2 last:border-0">
      <span className="text-sm">{label}</span>
      <select
        className={inputClass}
        value={value.anexado}
        onChange={(e) => onChange({ ...value, anexado: e.target.value as "SIM" | "NAO" })}
      >
        <option value="SIM">Anexado</option>
        <option value="NAO">Não anexado</option>
      </select>
      {value.anexado === "NAO" && (
        <input
          className={inputClass}
          placeholder="Justificativa"
          value={value.justificativa || ""}
          onChange={(e) => onChange({ ...value, justificativa: e.target.value })}
        />
      )}
    </div>
  );
}

export function CronogramaTable({
  itens,
  onChange,
}: {
  itens: { acao: string; prazoInicio: string; prazoFim: string }[];
  onChange: (itens: { acao: string; prazoInicio: string; prazoFim: string }[]) => void;
}) {
  function updateItem(i: number, field: string, value: string) {
    const next = [...itens];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-[var(--color-paper-200)] rounded-[var(--radius-card)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--color-paper-50)]">
              <th className="p-2 text-left font-medium border-b">Ação</th>
              <th className="p-2 text-left font-medium border-b">Prazo início</th>
              <th className="p-2 text-left font-medium border-b">Prazo fim</th>
              <th className="border-b"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-1"><input className={inputClass} value={item.acao} onChange={(e) => updateItem(i, "acao", e.target.value)} /></td>
                <td className="p-1"><input className={inputClass} value={item.prazoInicio} onChange={(e) => updateItem(i, "prazoInicio", e.target.value)} /></td>
                <td className="p-1"><input className={inputClass} value={item.prazoFim} onChange={(e) => updateItem(i, "prazoFim", e.target.value)} /></td>
                <td className="p-1">
                  {itens.length > 1 && (
                    <button type="button" onClick={() => onChange(itens.filter((_, idx) => idx !== i))} className="text-red-500 text-xs px-2">
                      remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange([...itens, { acao: "", prazoInicio: "", prazoFim: "" }])}
        className="text-xs text-[var(--color-brand-600)] hover:underline"
      >
        + adicionar ação
      </button>
    </div>
  );
}
