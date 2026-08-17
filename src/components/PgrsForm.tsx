"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { SectionCard } from "@/components/ui/SectionCard";
import { useToast } from "@/components/Toast";
import {
  DadosEstabelecimentoFields,
  DadosEstabelecimentoValues,
} from "@/components/DadosEstabelecimentoFields";
import {
  ResiduoTable,
  EmpresasContratadasTable,
  AnexoRow,
  CronogramaTable,
} from "@/components/PgrsTables";
import {
  Loader2,
  ArrowLeft,
  FileText,
  Building2,
  Recycle,
  Truck,
  Download,
  PenLine,
  GraduationCap,
  CalendarDays,
  Paperclip,
} from "lucide-react";
import {
  emptyPgrsFormData,
  ANEXO_LABELS,
  type PgrsPinhaisFormData,
  type ResiduoInput,
} from "@/lib/templates/pgrs-pinhais/config";
import {
  emptyPgrsCuritibaFormData,
  ANEXO_CURITIBA_LABELS,
  type PgrsCuritibaFormData,
} from "@/lib/templates/pgrs-curitiba/config";

type AnexoKeysPinhais = "anexo1" | "anexo2" | "anexo3" | "anexo4";
type AnexoKeysCuritiba = "anexo1" | "anexo2" | "anexo3" | "anexo4" | "anexo5" | "anexo6";

type ClienteSer = Record<string, unknown> & {
  razaoSocial: string;
  nomeFantasia?: string | null;
  ramoAtividade?: string | null;
  diasFuncionamento?: string | null;
  horariosFuncionamento?: string | null;
  areaConstruida?: string | null;
  porteColaboradores?: string | null;
  possuiRefeitorio?: boolean | null;
  refeicoesDiarias?: string | null;
  unidadesDia?: string | null;
  preparoRefeicoes?: string | null;
  responsavelTecnicoNome?: string | null;
  responsavelTecnicoConselho?: string | null;
  responsavelTecnicoCpf?: string | null;
  responsavelPgrsNome?: string | null;
  responsavelPgrsCargo?: string | null;
  residuos?: { categoria: string; pontoGeracao: string; residuosGerados: string; quantificacao: string; acondicionamento: string; armazenamento: string; coletaInterna?: string | null; empresaTransporte: string; empresaDisposicaoFinal: string }[];
  empresasContratadas?: { nomeFantasia: string; razaoSocial: string; cnpj: string; numeroDataValidadeLicenca: string }[];
};

type ResiduoSer = {
  pontoGeracao: string;
  residuosGerados: string;
  quantificacao: string;
  acondicionamento: string;
  armazenamento: string;
  coletaInterna: string;
  empresaTransporte: string;
  empresaDisposicaoFinal: string;
};

function porCategoria(cliente: ClienteSer, cat: string): ResiduoSer[] {
  return (cliente.residuos || [])
    .filter((r) => r.categoria === cat)
    .map((r) => ({
      pontoGeracao: r.pontoGeracao || "",
      residuosGerados: r.residuosGerados || "",
      quantificacao: r.quantificacao || "",
      acondicionamento: r.acondicionamento || "",
      armazenamento: r.armazenamento || "",
      coletaInterna: r.coletaInterna || "",
      empresaTransporte: r.empresaTransporte || "",
      empresaDisposicaoFinal: r.empresaDisposicaoFinal || "",
    }));
}

function empresasContratadas(cliente: ClienteSer) {
  return (cliente.empresasContratadas || []).map((e) => ({
    nomeFantasia: e.nomeFantasia || "",
    razaoSocial: e.razaoSocial || "",
    cnpj: e.cnpj || "",
    numeroDataValidadeLicenca: e.numeroDataValidadeLicenca || "",
  }));
}

function dadosEstabelecimento(cliente: ClienteSer): DadosEstabelecimentoValues {
  return {
    ramoAtividade: cliente.ramoAtividade || "",
    diasFuncionamento: cliente.diasFuncionamento || "",
    horariosFuncionamento: cliente.horariosFuncionamento || "",
    areaConstruida: cliente.areaConstruida || "",
    porteColaboradores: cliente.porteColaboradores || "",
    possuiRefeitorio: !!cliente.possuiRefeitorio,
    refeicoesDiarias: cliente.refeicoesDiarias || "",
    unidadesDia: cliente.unidadesDia || "",
    preparoRefeicoes: cliente.preparoRefeicoes || "NO_LOCAL",
    responsavelTecnicoNome: cliente.responsavelTecnicoNome || "",
    responsavelTecnicoConselho: cliente.responsavelTecnicoConselho || "",
    responsavelTecnicoCpf: cliente.responsavelTecnicoCpf || "",
    responsavelPgrsNome: cliente.responsavelPgrsNome || "",
    responsavelPgrsCargo: cliente.responsavelPgrsCargo || "",
  };
}

const inputCls = "input-field w-full";
const labelCls = "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

function Campo({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </div>
  );
}

interface Props {
  clienteId: number;
  clienteApelido: string;
  cliente: ClienteSer;
  templateSlug: "pgrs-pinhais" | "pgrs-curitiba";
}

export function PgrsForm({ clienteId, clienteApelido, cliente, templateSlug }: Props) {
  const isCuritiba = templateSlug === "pgrs-curitiba";
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<PgrsPinhaisFormData | PgrsCuritibaFormData>(() => {
    const perigosos = porCategoria(cliente, "PERIGOSO");
    const naoReciclaveis = porCategoria(cliente, "NAO_RECICLAVEL");
    const reciclaveis = porCategoria(cliente, "RECICLAVEL");
    const contratadas = empresasContratadas(cliente);

    if (isCuritiba) {
      const base = emptyPgrsCuritibaFormData();
      return {
        ...base,
        residuosPerigosos: perigosos.length ? perigosos : base.residuosPerigosos,
        residuosNaoReciclaveis: naoReciclaveis.length ? naoReciclaveis : base.residuosNaoReciclaveis,
        residuosReciclaveis: reciclaveis.length ? reciclaveis : base.residuosReciclaveis,
        empresasContratadas: contratadas.length ? contratadas : base.empresasContratadas,
      };
    }
    const base = emptyPgrsFormData();
    return {
      ...base,
      residuosPerigosos: perigosos.length ? perigosos : base.residuosPerigosos,
      residuosNaoReciclaveis: naoReciclaveis.length ? naoReciclaveis : base.residuosNaoReciclaveis,
      residuosReciclaveis: reciclaveis.length ? reciclaveis : base.residuosReciclaveis,
      empresasContratadas: contratadas.length ? contratadas : base.empresasContratadas,
      responsavelAssinaturaNome: cliente.responsavelPgrsNome || "",
      responsavelAssinaturaCargo: cliente.responsavelPgrsCargo || "",
    };
  });

  const [dadosEstab, setDadosEstab] = useState<DadosEstabelecimentoValues>(() =>
    dadosEstabelecimento(cliente)
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setFormField = (patch: Partial<PgrsPinhaisFormData | PgrsCuritibaFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const setResiduos = (cat: "residuosPerigosos" | "residuosNaoReciclaveis" | "residuosReciclaveis", itens: ResiduoInput[]) => {
    setForm((prev) => ({ ...prev, [cat]: itens }));
    setDirty(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, templateSlug, formData: form, dadosEstabelecimento: dadosEstab }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(String(err.error || "Erro ao gerar o documento"), "error");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `${isCuritiba ? "PGRS_Curitiba" : "PGRS_Pinhais"}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDirty(false);
      toast(isCuritiba ? "PGRS Curitiba gerado com sucesso" : "PGRS Pinhais gerado com sucesso", "success");
      router.refresh();
    } catch {
      toast("Erro ao gerar o documento", "error");
    } finally {
      setSaving(false);
    }
  }

  const titulo = isCuritiba ? "PGRS Simplificado — Curitiba" : "PGRS Simplificado — Pinhais";
  const subtitulo = isCuritiba
    ? "Plano de Gerenciamento de Resíduos Sólidos Simplificado da Secretaria Municipal do Meio Ambiente de Curitiba/PR"
    : "Termo de Referência do Plano de Gerenciamento de Resíduos Sólidos Simplificado do município de Pinhais/PR";

  return (
    <div>
      <Topbar
        icon={FileText}
        title={`${titulo} — ${clienteApelido}`}
        subtitle={subtitulo}
        actions={
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6 p-6">
        <SectionCard icon={Building2} title="Dados do estabelecimento" subtitle="Esses dados ficam salvos no cadastro do cliente e já vêm preenchidos na próxima vez.">
          <DadosEstabelecimentoFields values={dadosEstab} onChange={(v) => { setDadosEstab(v); setDirty(true); }} />
        </SectionCard>

        <SectionCard icon={Recycle} title="Resíduos gerados" subtitle="Preencha os resíduos por categoria">
          <div className="space-y-6">
            <ResiduoTable titulo="Resíduos perigosos" itens={(form as PgrsPinhaisFormData).residuosPerigosos} comColetaInterna onChange={(v) => setResiduos("residuosPerigosos", v)} />
            <ResiduoTable titulo="Resíduos não recicláveis" itens={(form as PgrsPinhaisFormData).residuosNaoReciclaveis} comColetaInterna={false} onChange={(v) => setResiduos("residuosNaoReciclaveis", v)} />
            <ResiduoTable titulo="Resíduos recicláveis" itens={(form as PgrsPinhaisFormData).residuosReciclaveis} comColetaInterna onChange={(v) => setResiduos("residuosReciclaveis", v)} />
          </div>
        </SectionCard>

        <SectionCard icon={Truck} title="Empresas contratadas" subtitle="Coleta, transporte e disposição final">
          <EmpresasContratadasTable itens={(form as PgrsPinhaisFormData).empresasContratadas} onChange={(v) => setFormField({ empresasContratadas: v })} />
        </SectionCard>

        {isCuritiba && (
          <>
            <SectionCard icon={GraduationCap} title="Treinamento e capacitação" subtitle="Capacitação do pessoal para segregação dos resíduos">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-[var(--color-ink-700)]">
                  <input
                    type="checkbox"
                    checked={(form as PgrsCuritibaFormData).capacitacaoOferta}
                    onChange={(e) => setFormField({ capacitacaoOferta: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Oferece cursos de treinamento sobre gerenciamento de resíduos
                </label>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Campo label="Frequência dos cursos" value={(form as PgrsCuritibaFormData).capacitacaoFrequencia} onChange={(v) => setFormField({ capacitacaoFrequencia: v })} />
                  <Campo label="Nº de funcionários treinados" value={(form as PgrsCuritibaFormData).capacitacaoNFuncionarios} onChange={(v) => setFormField({ capacitacaoNFuncionarios: v })} />
                  <Campo label="Responsável pela capacitação" value={(form as PgrsCuritibaFormData).capacitacaoResponsavel} onChange={(v) => setFormField({ capacitacaoResponsavel: v })} />
                  <Campo label="Conselho de classe / nº de registro" value={(form as PgrsCuritibaFormData).capacitacaoConselhoRegistro} onChange={(v) => setFormField({ capacitacaoConselhoRegistro: v })} />
                </div>
                <Campo label="Conteúdos abordados" value={(form as PgrsCuritibaFormData).capacitacaoConteudos} onChange={(v) => setFormField({ capacitacaoConteudos: v })} textarea />
              </div>
            </SectionCard>

            <SectionCard icon={CalendarDays} title="Cronograma" subtitle="Cronograma de implantação, execução e revisão do PGRS">
              <CronogramaTable itens={(form as PgrsCuritibaFormData).cronograma} onChange={(v) => setFormField({ cronograma: v })} />
            </SectionCard>
          </>
        )}

        <SectionCard icon={PenLine} title="Observações gerais" subtitle="Informações complementares">
          <Campo label="Observações" value={(form as PgrsPinhaisFormData).observacoesGerais} onChange={(v) => setFormField({ observacoesGerais: v })} textarea />
        </SectionCard>

        {!isCuritiba && (
          <SectionCard icon={PenLine} title="Assinatura" subtitle="Responsável pela assinatura do documento">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Campo label="Nome do responsável" value={(form as PgrsPinhaisFormData).responsavelAssinaturaNome} onChange={(v) => setFormField({ responsavelAssinaturaNome: v })} />
              <Campo label="Cargo" value={(form as PgrsPinhaisFormData).responsavelAssinaturaCargo} onChange={(v) => setFormField({ responsavelAssinaturaCargo: v })} />
            </div>
          </SectionCard>
        )}

        <SectionCard icon={Paperclip} title="Anexos" subtitle="Informe se cada documento será anexado ao PGRS">
          <div>
            {isCuritiba
              ? (Object.keys(ANEXO_CURITIBA_LABELS) as AnexoKeysCuritiba[]).map((key) => (
                  <AnexoRow
                    key={key}
                    label={ANEXO_CURITIBA_LABELS[key]}
                    value={(form as PgrsCuritibaFormData)[key]}
                    onChange={(v) => setFormField({ [key]: v } as Partial<PgrsCuritibaFormData>)}
                  />
                ))
              : (Object.keys(ANEXO_LABELS) as AnexoKeysPinhais[]).map((key) => (
                  <AnexoRow
                    key={key}
                    label={ANEXO_LABELS[key]}
                    value={(form as PgrsPinhaisFormData)[key]}
                    onChange={(v) => setFormField({ [key]: v } as Partial<PgrsPinhaisFormData>)}
                  />
                ))}
          </div>
        </SectionCard>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring transition-brand inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <ArrowLeft size={16} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="focus-ring transition-brand inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {saving ? "Gerando..." : "Gerar documento (.docx)"}
          </button>
        </div>
      </form>
    </div>
  );
}
