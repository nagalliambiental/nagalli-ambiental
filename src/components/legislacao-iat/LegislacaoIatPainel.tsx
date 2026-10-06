"use client";

import { useMemo, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/format";

export type LegislacaoIatLinha = {
  id: number;
  tipo: string;
  numero: number;
  ano: number;
  titulo: string;
  ementa: string;
  url: string | null;
  anexosUrl: string | null;
  situacao: string;
  revogadaPor: string | null;
  dataAto: string | null;
  dataPublicacao: string | null;
};

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

function externa(url: string | null): string | null {
  if (!url) return null;
  const limpo = url.trim();
  return /^https?:\/\//i.test(limpo) ? limpo : null;
}

function mesPublicacao(p: string): string {
  const [ano, mes] = p.split("-");
  return mes && ano ? `${mes}/${ano}` : p;
}

const INPUT =
  "focus-ring rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)]";

export function LegislacaoIatPainel({
  itens,
  fonteUrl,
  ultimaVerificacao,
}: {
  itens: LegislacaoIatLinha[];
  fonteUrl: string;
  ultimaVerificacao: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("");
  const [tipo, setTipo] = useState("");
  const [situacao, setSituacao] = useState("");

  const anos = useMemo(() => [...new Set(itens.map((i) => i.ano))].sort((a, b) => b - a), [itens]);
  const totalVigentes = itens.filter((i) => i.situacao === "vigente").length;
  const totalRevogadas = itens.filter((i) => i.situacao === "revogada").length;

  const filtrados = useMemo(() => {
    const b = busca.toLowerCase().trim();
    return itens.filter(
      (i) =>
        (!ano || i.ano === Number(ano)) &&
        (!tipo || i.tipo === tipo) &&
        (!situacao || i.situacao === situacao) &&
        (!b || `${i.titulo} ${i.ementa}`.toLowerCase().includes(b)),
    );
  }, [itens, busca, ano, tipo, situacao]);

  const grupos = useMemo(() => {
    const mapa = new Map<number, LegislacaoIatLinha[]>();
    for (const item of filtrados) {
      const lista = mapa.get(item.ano) ?? [];
      lista.push(item);
      mapa.set(item.ano, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => b.numero - a.numero || a.tipo.localeCompare(b.tipo));
    return [...mapa.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtrados]);

  const fonte = externa(fonteUrl);
  const pdfNorma = (i: LegislacaoIatLinha) => externa(i.url) ?? externa(i.anexosUrl);

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-paper-200)] p-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="li-busca" className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">
            Buscar
          </label>
          <input
            id="li-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Número, assunto ou ementa..."
            className={`w-full ${INPUT}`}
          />
        </div>
        <div>
          <label htmlFor="li-ano" className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">
            Ano
          </label>
          <select id="li-ano" value={ano} onChange={(e) => setAno(e.target.value)} className={INPUT}>
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="li-tipo" className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">
            Tipo
          </label>
          <select id="li-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={INPUT}>
            <option value="">Todas</option>
            <option value="IN">Instrução Normativa</option>
            <option value="OT">Orientação Técnica</option>
          </select>
        </div>
        <div>
          <label htmlFor="li-situacao" className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">
            Situação
          </label>
          <select id="li-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)} className={INPUT}>
            <option value="">Todas</option>
            <option value="vigente">Vigentes</option>
            <option value="revogada">Revogadas</option>
          </select>
        </div>
        <p className="pb-2 text-xs text-[var(--color-ink-500)]">
          {totalVigentes} vigente(s) · {totalRevogadas} revogada(s) · {filtrados.length} exibida(s)
        </p>
      </div>

      {grupos.map(([grupoAno, lista]) => (
        <div key={grupoAno}>
          <p className="border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-700)]">
            {grupoAno}
          </p>
          <ul className="divide-y divide-[var(--color-paper-100)]">
            {lista.map((i) => {
              const link = pdfNorma(i);
              // "Novo" usa a data oficial do ato (ou o mês de publicação), não a data do cadastro.
              const referencia = i.dataAto
                ? new Date(i.dataAto).getTime()
                : i.dataPublicacao
                  ? Date.parse(`${i.dataPublicacao}-01T00:00:00Z`)
                  : null;
              const novo = referencia !== null && Date.now() - referencia < TRINTA_DIAS;
              return (
                <li key={i.id} className="px-5 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-ink-900)]">
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-2 hover:underline"
                      >
                        {i.titulo} ↗
                      </a>
                    ) : (
                      i.titulo
                    )}
                    {i.situacao === "revogada" ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        Revogada
                      </span>
                    ) : novo ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
                        Novo
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[var(--color-paper-100)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-ink-500)]">
                      {i.tipo}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-500)]">{i.ementa}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                    {externa(i.url) && (
                      <a
                        href={externa(i.url)!}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--color-brand-600)] underline-offset-2 hover:underline"
                      >
                        Abrir norma (PDF) ↗
                      </a>
                    )}
                    {externa(i.anexosUrl) && (
                      <a
                        href={externa(i.anexosUrl)!}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--color-brand-600)] underline-offset-2 hover:underline"
                      >
                        Anexos ↗
                      </a>
                    )}
                    {i.situacao === "revogada" && i.revogadaPor && (
                      <span className="font-medium text-red-600">Revogada pela {i.revogadaPor}</span>
                    )}
                    {i.dataAto && <span className="text-[var(--color-ink-500)]">Data do ato: {formatDate(new Date(i.dataAto))}</span>}
                    {!i.dataAto && i.dataPublicacao && (
                      <span className="text-[var(--color-ink-500)]">Publicada em {mesPublicacao(i.dataPublicacao)}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {filtrados.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-[var(--color-ink-500)]">
          Nenhuma norma encontrada com os filtros informados.
        </p>
      )}

      <p className="border-t border-[var(--color-paper-200)] px-5 py-3 text-xs text-[var(--color-ink-500)]">
        {ultimaVerificacao ? `Última verificação: ${formatDateTime(ultimaVerificacao)} · ` : ""}
        Atualização automática diária · Fonte:{" "}
        {fonte ? (
          <a href={fonte} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Instruções Normativas / Orientações Técnicas do IAT ↗
          </a>
        ) : (
          "site do IAT"
        )}
      </p>
    </div>
  );
}
