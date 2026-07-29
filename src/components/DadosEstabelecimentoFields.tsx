"use client";

export interface DadosEstabelecimentoValues {
  ramoAtividade: string;
  diasFuncionamento: string;
  horariosFuncionamento: string;
  areaConstruida: string;
  porteColaboradores: string;
  possuiRefeitorio: boolean;
  refeicoesDiarias: string;
  unidadesDia: string;
  preparoRefeicoes: string;
  dirigenteNome: string;
  dirigenteCargo: string;
  responsavelPgrsNome: string;
  responsavelPgrsCargo: string;
}

export const emptyDadosEstabelecimento = (): DadosEstabelecimentoValues => ({
  ramoAtividade: "",
  diasFuncionamento: "",
  horariosFuncionamento: "",
  areaConstruida: "",
  porteColaboradores: "",
  possuiRefeitorio: false,
  refeicoesDiarias: "",
  unidadesDia: "",
  preparoRefeicoes: "NO_LOCAL",
  dirigenteNome: "",
  dirigenteCargo: "",
  responsavelPgrsNome: "",
  responsavelPgrsCargo: "",
});

const inputClass =
  "focus-ring w-full rounded-lg border border-[var(--color-paper-200)] px-2 py-1.5 text-xs text-[var(--color-ink-900)]";

export function DadosEstabelecimentoFields({
  values,
  onChange,
}: {
  values: DadosEstabelecimentoValues;
  onChange: (values: DadosEstabelecimentoValues) => void;
}) {
  function set<K extends keyof DadosEstabelecimentoValues>(key: K, v: DadosEstabelecimentoValues[K]) {
    onChange({ ...values, [key]: v });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-paper-200)] p-4">
      <p className="text-xs text-[var(--color-ink-500)]">
        Esses dados ficam salvos no cadastro do cliente e já vêm preenchidos na próxima vez.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Ramo de atividade" value={values.ramoAtividade} onChange={(e) => set("ramoAtividade", e.target.value)} />
        <input className={inputClass} placeholder="Dias de funcionamento" value={values.diasFuncionamento} onChange={(e) => set("diasFuncionamento", e.target.value)} />
        <input className={inputClass} placeholder="Horários de funcionamento" value={values.horariosFuncionamento} onChange={(e) => set("horariosFuncionamento", e.target.value)} />
        <input className={inputClass} placeholder="Área construída (m²)" value={values.areaConstruida} onChange={(e) => set("areaConstruida", e.target.value)} />
        <input className={inputClass} placeholder="Porte / nº de colaboradores" value={values.porteColaboradores} onChange={(e) => set("porteColaboradores", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={values.possuiRefeitorio} onChange={(e) => set("possuiRefeitorio", e.target.checked)} />
          Possui refeitório na empresa
        </label>
        <select className={inputClass} value={values.preparoRefeicoes} onChange={(e) => set("preparoRefeicoes", e.target.value)}>
          <option value="NO_LOCAL">Preparo no local</option>
          <option value="TERCEIRIZADO">Preparo terceirizado</option>
        </select>
        <input className={inputClass} placeholder="Refeições diárias" value={values.refeicoesDiarias} onChange={(e) => set("refeicoesDiarias", e.target.value)} />
        <input className={inputClass} placeholder="Unidades/dia" value={values.unidadesDia} onChange={(e) => set("unidadesDia", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Dirigente do empreendimento" value={values.dirigenteNome} onChange={(e) => set("dirigenteNome", e.target.value)} />
        <input className={inputClass} placeholder="Cargo do dirigente" value={values.dirigenteCargo} onChange={(e) => set("dirigenteCargo", e.target.value)} />
        <input className={inputClass} placeholder="Responsável pela implantação do PGRS" value={values.responsavelPgrsNome} onChange={(e) => set("responsavelPgrsNome", e.target.value)} />
        <input className={inputClass} placeholder="Cargo do responsável" value={values.responsavelPgrsCargo} onChange={(e) => set("responsavelPgrsCargo", e.target.value)} />
      </div>
    </div>
  );
}
