"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { SectionCard } from "@/components/ui/SectionCard";
import { useToast } from "@/components/Toast";
import { extrairPgrsDoTexto } from "@/lib/pgrs-extract";
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
  Upload,
  Users,
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
import {
  emptyPgrsSjFormData,
  ANEXO_SJ_LABELS,
  type PgrsSjFormData,
} from "@/lib/templates/pgrs-sj-pinhais/config";

type AnexoKeysPinhais = "anexo1" | "anexo2" | "anexo3" | "anexo4";
type AnexoKeysCuritiba = "anexo1" | "anexo2" | "anexo3" | "anexo4" | "anexo5" | "anexo6";

type AnyPgrsFormData = PgrsPinhaisFormData | PgrsCuritibaFormData | PgrsSjFormData;

type ClienteSer = Record<string, unknown> & {
  razaoSocial: string;
  cnpj?: string | null;
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
  representanteLegalNome?: string | null;
  respLegal?: string | null;
  responsavelElaboracaoNome?: string | null;
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
  templateSlug: "pgrs-pinhais" | "pgrs-curitiba" | "pgrs-sj-pinhais";
  initialData?: Partial<AnyPgrsFormData>;
  reaproveitar?: Record<string, unknown> | null;
  docId?: number;
}

export function PgrsForm({ clienteId, clienteApelido, cliente, templateSlug, initialData, reaproveitar, docId }: Props) {
  const isCuritiba = templateSlug === "pgrs-curitiba";
  const isSj = templateSlug === "pgrs-sj-pinhais";
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<AnyPgrsFormData>(() => {
    const base = isSj ? emptyPgrsSjFormData() : isCuritiba ? emptyPgrsCuritibaFormData() : emptyPgrsFormData();
    if (initialData && Object.keys(initialData).length > 2) {
      return { ...base, ...initialData } as AnyPgrsFormData;
    }
    const perigosos = porCategoria(cliente, "PERIGOSO");
    const naoReciclaveis = porCategoria(cliente, "NAO_RECICLAVEL");
    const reciclaveis = porCategoria(cliente, "RECICLAVEL");
    const contratadas = empresasContratadas(cliente);

    let resultado: AnyPgrsFormData;
    if (isSj) {
      resultado = {
        ...base,
        residuosPerigosos: perigosos.length ? perigosos : base.residuosPerigosos,
        residuosNaoReciclaveis: naoReciclaveis.length ? naoReciclaveis : base.residuosNaoReciclaveis,
        residuosReciclaveis: reciclaveis.length ? reciclaveis : base.residuosReciclaveis,
        empresasContratadas: contratadas.length ? contratadas : base.empresasContratadas,
        respEmpreendimentoNome: cliente.representanteLegalNome || cliente.respLegal || "",
        respImplantacaoNome: cliente.responsavelPgrsNome || "",
        respImplantacaoCargo: cliente.responsavelPgrsCargo || "",
        respTecnicoNome: cliente.responsavelElaboracaoNome || cliente.responsavelTecnicoNome || "",
      } as AnyPgrsFormData;
    } else if (isCuritiba) {
      resultado = {
        ...base,
        residuosPerigosos: perigosos.length ? perigosos : base.residuosPerigosos,
        residuosNaoReciclaveis: naoReciclaveis.length ? naoReciclaveis : base.residuosNaoReciclaveis,
        residuosReciclaveis: reciclaveis.length ? reciclaveis : base.residuosReciclaveis,
        empresasContratadas: contratadas.length ? contratadas : base.empresasContratadas,
      } as AnyPgrsFormData;
    } else {
      resultado = {
        ...base,
        residuosPerigosos: perigosos.length ? perigosos : base.residuosPerigosos,
        residuosNaoReciclaveis: naoReciclaveis.length ? naoReciclaveis : base.residuosNaoReciclaveis,
        residuosReciclaveis: reciclaveis.length ? reciclaveis : base.residuosReciclaveis,
        empresasContratadas: contratadas.length ? contratadas : base.empresasContratadas,
        responsavelAssinaturaNome: cliente.responsavelPgrsNome || "",
        responsavelAssinaturaCargo: cliente.responsavelPgrsCargo || "",
      } as AnyPgrsFormData;
    }

    if (reaproveitar) {
      const limpo: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(reaproveitar)) {
        if (!(k in base) || v === null || v === undefined) continue;
        if (Array.isArray(v)) {
          if (v.length) limpo[k] = v;
          continue;
        }
        limpo[k] = v;
      }
      resultado = { ...resultado, ...limpo } as AnyPgrsFormData;
    }
    return resultado;
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

  const setFormField = (patch: Partial<AnyPgrsFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const setResiduos = (cat: "residuosPerigosos" | "residuosNaoReciclaveis" | "residuosReciclaveis", itens: ResiduoInput[]) => {
    setForm((prev) => ({ ...prev, [cat]: itens }));
    setDirty(true);
  };

  const arquivoRef = useRef<HTMLInputElement | null>(null);
  const [importando, setImportando] = useState(false);

  async function handleImportarArquivo(file: File) {
    setImportando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documentos-gerados/extract", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(String(err.error || "Erro ao ler o arquivo"), "error");
        return;
      }
      const data = (await res.json()) as { texto?: string; campos?: Record<string, string> };
      if (!data.texto) {
        toast("Nenhum texto encontrado no arquivo", "warning");
        return;
      }

      const { formPatch, estabPatch } = extrairPgrsDoTexto(data.texto);
      const chavesForm = Object.keys(formPatch).filter((k) => k in form);
      const chavesEstab = Object.keys(estabPatch).filter((k) => k in dadosEstab);

      if (!chavesForm.length && !chavesEstab.length) {
        toast("Nenhum dado de PGRS reconhecido no arquivo", "warning");
        return;
      }

      if (chavesForm.length) {
        setForm((prev) => {
          const proximo = { ...prev } as Record<string, unknown>;
          for (const k of chavesForm) proximo[k] = formPatch[k];
          return proximo as unknown as AnyPgrsFormData;
        });
      }
      if (chavesEstab.length) {
        setDadosEstab((prev) => {
          const proximo = { ...prev } as Record<string, unknown>;
          for (const k of chavesEstab) proximo[k] = estabPatch[k];
          return proximo as unknown as DadosEstabelecimentoValues;
        });
      }
      setDirty(true);

      toast(
        `PGRS importado: ${chavesForm.length + chavesEstab.length} campo(s) preenchido(s)`,
        "success"
      );

      const cnpjDoc = (data.campos?.cnpj || "").replace(/\D/g, "");
      const cnpjCli = (cliente.cnpj || "").replace(/\D/g, "");
      if (cnpjDoc && cnpjCli && cnpjDoc !== cnpjCli) {
        toast("Atenção: o CNPJ do arquivo importado não corresponde a este cliente", "warning");
      }
    } catch {
      toast("Erro ao importar o PGRS", "error");
    } finally {
      setImportando(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = docId ? `/api/documentos-gerados/${docId}` : "/api/documentos/gerar";
      const method = docId ? "PUT" : "POST";
      const body = docId
        ? { formData: form }
        : { clienteId, templateSlug, formData: form, dadosEstabelecimento: dadosEstab };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(String(err.error || "Erro ao gerar o documento"), "error");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const nomeArquivo = isSj
        ? "PGRS_Sao_Jose_dos_Pinhais"
        : isCuritiba
          ? "PGRS_Curitiba"
          : "PGRS_Pinhais";
      const filename = match ? match[1] : `${nomeArquivo}.docx`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      setDirty(false);
      toast(
        docId
          ? "Documento atualizado com sucesso"
          : isSj
            ? "PGRS São José dos Pinhais gerado com sucesso"
            : isCuritiba
              ? "PGRS Curitiba gerado com sucesso"
              : "PGRS Pinhais gerado com sucesso",
        "success"
      );
      router.refresh();
    } catch {
      toast("Erro ao gerar o documento", "error");
    } finally {
      setSaving(false);
    }
  }

  const titulo = isSj
    ? "PGRS Simplificado — São José dos Pinhais"
    : isCuritiba
      ? "PGRS Simplificado — Curitiba"
      : "PGRS Simplificado — Pinhais";
  const subtitulo = docId
    ? "Edite os dados e gere o documento atualizado"
    : isSj
      ? "Formulário de Plano de Gerenciamento de Resíduos Sólidos do município de São José dos Pinhais/PR"
      : isCuritiba
        ? "Plano de Gerenciamento de Resíduos Sólidos Simplificado da Secretaria Municipal do Meio Ambiente de Curitiba/PR"
        : "Termo de Referência do Plano de Gerenciamento de Resíduos Sólidos Simplificado do município de Pinhais/PR";

  return (
    <div>
      <Topbar
        icon={FileText}
        title={docId ? `Editar ${titulo} — ${clienteApelido}` : `${titulo} — ${clienteApelido}`}
        subtitle={subtitulo}
        actions={
          <>
            <input
              ref={arquivoRef}
              type="file"
              accept=".docx,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportarArquivo(f);
              }}
            />
            <button
              type="button"
              onClick={() => arquivoRef.current?.click()}
              disabled={importando}
              className="focus-ring transition-brand inline-flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] disabled:opacity-50"
            >
              {importando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importando ? "Importando..." : "Importar PGRS"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </>
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

        {(isCuritiba || isSj) && (
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
                {isSj && !(form as PgrsSjFormData).capacitacaoOferta && (
                  <Campo
                    label="Justificativa (obrigatória ao marcar NÃO)"
                    value={(form as PgrsSjFormData).capacitacaoJustificativa}
                    onChange={(v) => setFormField({ capacitacaoJustificativa: v })}
                    textarea
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard icon={CalendarDays} title="Cronograma" subtitle="Cronograma de implantação, execução e revisão do PGRS">
              <CronogramaTable itens={(form as PgrsCuritibaFormData).cronograma} onChange={(v) => setFormField({ cronograma: v })} />
            </SectionCard>
          </>
        )}

        {isSj && (
          <SectionCard icon={Users} title="Responsáveis" subtitle="Responsáveis pelo empreendimento e pela elaboração do PGRS">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  Responsável do empreendimento
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Campo label="Nome" value={(form as PgrsSjFormData).respEmpreendimentoNome} onChange={(v) => setFormField({ respEmpreendimentoNome: v })} />
                  <Campo label="Cargo" value={(form as PgrsSjFormData).respEmpreendimentoCargo} onChange={(v) => setFormField({ respEmpreendimentoCargo: v })} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  Responsável pela implantação do PGRS
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Campo label="Nome" value={(form as PgrsSjFormData).respImplantacaoNome} onChange={(v) => setFormField({ respImplantacaoNome: v })} />
                  <Campo label="Cargo" value={(form as PgrsSjFormData).respImplantacaoCargo} onChange={(v) => setFormField({ respImplantacaoCargo: v })} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  Responsável técnico pela elaboração do PGRS
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Campo label="Nome" value={(form as PgrsSjFormData).respTecnicoNome} onChange={(v) => setFormField({ respTecnicoNome: v })} />
                  <Campo label="Cargo" value={(form as PgrsSjFormData).respTecnicoCargo} onChange={(v) => setFormField({ respTecnicoCargo: v })} />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard icon={PenLine} title="Observações gerais" subtitle="Informações complementares">
          <Campo label="Observações" value={(form as PgrsPinhaisFormData).observacoesGerais} onChange={(v) => setFormField({ observacoesGerais: v })} textarea />
        </SectionCard>

        {!isCuritiba && !isSj && (
          <SectionCard icon={PenLine} title="Assinatura" subtitle="Responsável pela assinatura do documento">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Campo label="Nome do responsável" value={(form as PgrsPinhaisFormData).responsavelAssinaturaNome} onChange={(v) => setFormField({ responsavelAssinaturaNome: v })} />
              <Campo label="Cargo" value={(form as PgrsPinhaisFormData).responsavelAssinaturaCargo} onChange={(v) => setFormField({ responsavelAssinaturaCargo: v })} />
            </div>
          </SectionCard>
        )}

        <SectionCard icon={Paperclip} title="Anexos" subtitle="Informe se cada documento será anexado ao PGRS">
          <div>
            {isSj
              ? (Object.keys(ANEXO_SJ_LABELS) as AnexoKeysCuritiba[]).map((key) => (
                  <AnexoRow
                    key={key}
                    label={ANEXO_SJ_LABELS[key]}
                    value={(form as PgrsSjFormData)[key]}
                    onChange={(v) => setFormField({ [key]: v } as Partial<PgrsSjFormData>)}
                  />
                ))
              : isCuritiba
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
            {saving ? "Gerando..." : docId ? "Salvar e gerar" : "Gerar documento (.docx)"}
          </button>
        </div>
      </form>
    </div>
  );
}
