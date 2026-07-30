export function generateStaticParams() { return []; }

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { DadosEstabelecimentoFields, DadosEstabelecimentoValues, emptyDadosEstabelecimento } from "@/components/DadosEstabelecimentoFields";
import { ResiduoTable, EmpresasContratadasTable, AnexoRow, CronogramaTable } from "@/components/PgrsTables";
import {
  PgrsCuritibaFormData,
  ANEXO_CURITIBA_LABELS,
  emptyPgrsCuritibaFormData,
} from "@/lib/templates/pgrs-curitiba/config";

const inputClass =
  "focus-ring w-full rounded-lg border border-[var(--color-paper-200)] px-2 py-1.5 text-xs text-[var(--color-ink-900)]";

export default function GerarPgrsCuritibaPage() {
  const params = useParams<{ id: string }>();
  const clienteId = params.id;

  const [clienteNome, setClienteNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PgrsCuritibaFormData>(emptyPgrsCuritibaFormData());
  const [dadosEstab, setDadosEstab] = useState<DadosEstabelecimentoValues>(emptyDadosEstabelecimento());

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/clientes/${clienteId}`);
      if (!res.ok) { setLoading(false); return; }
      const cliente = await res.json();
      setClienteNome(cliente.razaoSocial);

      const porCategoria = (cat: string) =>
        (cliente.residuos || [])
          .filter((r: any) => r.categoria === cat)
          .map((r: any) => ({
            pontoGeracao: r.pontoGeracao || "",
            residuosGerados: r.residuosGerados || "",
            quantificacao: r.quantificacao || "",
            acondicionamento: r.acondicionamento || "",
            armazenamento: r.armazenamento || "",
            coletaInterna: r.coletaInterna || "",
            empresaTransporte: r.empresaTransporte || "",
            empresaDisposicaoFinal: r.empresaDisposicaoFinal || "",
          }));

      const empresasContratadas = (cliente.empresasContratadas || []).map((e: any) => ({
        nomeFantasia: e.nomeFantasia || "",
        razaoSocial: e.razaoSocial || "",
        cnpj: e.cnpj || "",
        numeroDataValidadeLicenca: e.numeroDataValidadeLicenca || "",
      }));

      setForm((prev) => ({
        ...prev,
        residuosPerigosos: porCategoria("PERIGOSO").length ? porCategoria("PERIGOSO") : prev.residuosPerigosos,
        residuosNaoReciclaveis: porCategoria("NAO_RECICLAVEL").length ? porCategoria("NAO_RECICLAVEL") : prev.residuosNaoReciclaveis,
        residuosReciclaveis: porCategoria("RECICLAVEL").length ? porCategoria("RECICLAVEL") : prev.residuosReciclaveis,
        empresasContratadas: empresasContratadas.length ? empresasContratadas : prev.empresasContratadas,
      }));
      setDadosEstab({
        ramoAtividade: cliente.ramoAtividade || "",
        diasFuncionamento: cliente.diasFuncionamento || "",
        horariosFuncionamento: cliente.horariosFuncionamento || "",
        areaConstruida: cliente.areaConstruida || "",
        porteColaboradores: cliente.porteColaboradores || "",
        possuiRefeitorio: !!cliente.possuiRefeitorio,
        refeicoesDiarias: cliente.refeicoesDiarias || "",
        unidadesDia: cliente.unidadesDia || "",
        preparoRefeicoes: cliente.preparoRefeicoes || "NO_LOCAL",
        dirigenteNome: cliente.dirigenteNome || "",
        dirigenteCargo: cliente.dirigenteCargo || "",
        responsavelPgrsNome: cliente.responsavelPgrsNome || "",
        responsavelPgrsCargo: cliente.responsavelPgrsCargo || "",
      });
      setLoading(false);
    }
    load();
  }, [clienteId]);

  async function handleGerar() {
    setGerando(true);
    setError(null);
    try {
      const res = await fetch("/api/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, templateSlug: "pgrs-curitiba", formData: form, dadosEstabelecimento: dadosEstab }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao gerar documento");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PGRS_Curitiba_${clienteNome.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGerando(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-ink-500)] p-8">Carregando...</p>;

  return (
    <div className="space-y-8">
      <Topbar title="PGRS Simplificado — Curitiba" subtitle={clienteNome} />

      {error && <p className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</p>}

      <div>
        <h3 className="font-medium text-sm mb-2">Dados do estabelecimento</h3>
        <DadosEstabelecimentoFields values={dadosEstab} onChange={setDadosEstab} />
      </div>

      <ResiduoTable titulo="Resíduos perigosos" itens={form.residuosPerigosos} comColetaInterna onChange={(v) => setForm((f) => ({ ...f, residuosPerigosos: v }))} />
      <ResiduoTable titulo="Resíduos não recicláveis" itens={form.residuosNaoReciclaveis} comColetaInterna={false} onChange={(v) => setForm((f) => ({ ...f, residuosNaoReciclaveis: v }))} />
      <ResiduoTable titulo="Resíduos recicláveis" itens={form.residuosReciclaveis} comColetaInterna onChange={(v) => setForm((f) => ({ ...f, residuosReciclaveis: v }))} />

      <div>
        <h3 className="font-medium text-sm mb-2">Empresas contratadas</h3>
        <EmpresasContratadasTable itens={form.empresasContratadas} onChange={(v) => setForm((f) => ({ ...f, empresasContratadas: v }))} />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Treinamento e capacitação</h3>
        <div className="space-y-3 border border-[var(--color-paper-200)] rounded-[var(--radius-card)] p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.capacitacaoOferta} onChange={(e) => setForm((f) => ({ ...f, capacitacaoOferta: e.target.checked }))} />
            Oferece cursos de treinamento sobre gerenciamento de resíduos
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Frequência dos cursos" value={form.capacitacaoFrequencia} onChange={(e) => setForm((f) => ({ ...f, capacitacaoFrequencia: e.target.value }))} />
            <input className={inputClass} placeholder="Nº de funcionários treinados" value={form.capacitacaoNFuncionarios} onChange={(e) => setForm((f) => ({ ...f, capacitacaoNFuncionarios: e.target.value }))} />
            <input className={inputClass} placeholder="Responsável pela capacitação" value={form.capacitacaoResponsavel} onChange={(e) => setForm((f) => ({ ...f, capacitacaoResponsavel: e.target.value }))} />
            <input className={inputClass} placeholder="Conselho de classe/nº" value={form.capacitacaoConselhoRegistro} onChange={(e) => setForm((f) => ({ ...f, capacitacaoConselhoRegistro: e.target.value }))} />
          </div>
          <input className={inputClass} placeholder="Conteúdos abordados" value={form.capacitacaoConteudos} onChange={(e) => setForm((f) => ({ ...f, capacitacaoConteudos: e.target.value }))} />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Cronograma de implantação/execução/revisão</h3>
        <CronogramaTable itens={form.cronograma} onChange={(v) => setForm((f) => ({ ...f, cronograma: v }))} />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Observações gerais</h3>
        <textarea
          className={inputClass + " h-24"}
          value={form.observacoesGerais}
          onChange={(e) => setForm((f) => ({ ...f, observacoesGerais: e.target.value }))}
        />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Anexos</h3>
        <div className="border border-[var(--color-paper-200)] rounded-[var(--radius-card)] px-3">
          <AnexoRow label={ANEXO_CURITIBA_LABELS.anexo1} value={form.anexo1} onChange={(v) => setForm((f) => ({ ...f, anexo1: v }))} />
          <AnexoRow label={ANEXO_CURITIBA_LABELS.anexo2} value={form.anexo2} onChange={(v) => setForm((f) => ({ ...f, anexo2: v }))} />
          <AnexoRow label={ANEXO_CURITIBA_LABELS.anexo3} value={form.anexo3} onChange={(v) => setForm((f) => ({ ...f, anexo3: v }))} />
          <AnexoRow label={ANEXO_CURITIBA_LABELS.anexo4} value={form.anexo4} onChange={(v) => setForm((f) => ({ ...f, anexo4: v }))} />
          <AnexoRow label={ANEXO_CURITIBA_LABELS.anexo5} value={form.anexo5} onChange={(v) => setForm((f) => ({ ...f, anexo5: v }))} />
          <AnexoRow label={ANEXO_CURITIBA_LABELS.anexo6} value={form.anexo6} onChange={(v) => setForm((f) => ({ ...f, anexo6: v }))} />
        </div>
      </div>

      <button
        onClick={handleGerar}
        disabled={gerando}
        className="focus-ring transition-brand bg-[var(--color-brand-500)] text-white px-5 py-2.5 rounded-[var(--radius-card)] text-sm font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50"
      >
        {gerando ? "Gerando..." : "Gerar documento (.docx)"}
      </button>
    </div>
  );
}
