-- Migração: corrigir registros antigos gravados como meia-noite UTC (00:00:00Z)
-- que exibiam o dia anterior em São Paulo (UTC-3).
-- Critério: somar 3h (-> 03:00Z = meia-noite de SP) apenas onde a coluna está
-- exatamente em epoch % 86400 = 0 (00:00:00 UTC), preservando timestamps reais.

DO $$
DECLARE
  queries text[] := ARRAY[
    'UPDATE "Contrato" SET "dataAssinatura" = "dataAssinatura" + interval ''3 hours'' WHERE "dataAssinatura" IS NOT NULL AND extract(epoch from "dataAssinatura")::numeric % 86400 = 0',
    'UPDATE "Contrato" SET "dataValidade" = "dataValidade" + interval ''3 hours'' WHERE "dataValidade" IS NOT NULL AND extract(epoch from "dataValidade")::numeric % 86400 = 0',
    'UPDATE "Processo" SET "validade" = "validade" + interval ''3 hours'' WHERE "validade" IS NOT NULL AND extract(epoch from "validade")::numeric % 86400 = 0',
    'UPDATE "Processo" SET "dataProtocolo" = "dataProtocolo" + interval ''3 hours'' WHERE "dataProtocolo" IS NOT NULL AND extract(epoch from "dataProtocolo")::numeric % 86400 = 0',
    'UPDATE "Processo" SET "dataContato" = "dataContato" + interval ''3 hours'' WHERE "dataContato" IS NOT NULL AND extract(epoch from "dataContato")::numeric % 86400 = 0',
    'UPDATE "Tarefa" SET "prazoFinal" = "prazoFinal" + interval ''3 hours'' WHERE "prazoFinal" IS NOT NULL AND extract(epoch from "prazoFinal")::numeric % 86400 = 0',
    'UPDATE "Tarefa" SET "dataLimite" = "dataLimite" + interval ''3 hours'' WHERE "dataLimite" IS NOT NULL AND extract(epoch from "dataLimite")::numeric % 86400 = 0',
    'UPDATE "Exigencia" SET "prazo" = "prazo" + interval ''3 hours'' WHERE extract(epoch from "prazo")::numeric % 86400 = 0',
    'UPDATE "Condicionante" SET "prazo" = "prazo" + interval ''3 hours'' WHERE "prazo" IS NOT NULL AND extract(epoch from "prazo")::numeric % 86400 = 0',
    'UPDATE "AutorizacaoCorte" SET "prazoCompensacao" = "prazoCompensacao" + interval ''3 hours'' WHERE "prazoCompensacao" IS NOT NULL AND extract(epoch from "prazoCompensacao")::numeric % 86400 = 0',
    'UPDATE "Financeiro" SET "dataVencimento" = "dataVencimento" + interval ''3 hours'' WHERE "dataVencimento" IS NOT NULL AND extract(epoch from "dataVencimento")::numeric % 86400 = 0',
    'UPDATE "Financeiro" SET "dataPagamento" = "dataPagamento" + interval ''3 hours'' WHERE "dataPagamento" IS NOT NULL AND extract(epoch from "dataPagamento")::numeric % 86400 = 0',
    'UPDATE "ControleDmr" SET "t1EnviadaEm" = "t1EnviadaEm" + interval ''3 hours'' WHERE "t1EnviadaEm" IS NOT NULL AND extract(epoch from "t1EnviadaEm")::numeric % 86400 = 0',
    'UPDATE "ControleDmr" SET "t2EnviadaEm" = "t2EnviadaEm" + interval ''3 hours'' WHERE "t2EnviadaEm" IS NOT NULL AND extract(epoch from "t2EnviadaEm")::numeric % 86400 = 0',
    'UPDATE "ControleDmr" SET "t3EnviadaEm" = "t3EnviadaEm" + interval ''3 hours'' WHERE "t3EnviadaEm" IS NOT NULL AND extract(epoch from "t3EnviadaEm")::numeric % 86400 = 0',
    'UPDATE "ControleDmr" SET "t4EnviadaEm" = "t4EnviadaEm" + interval ''3 hours'' WHERE "t4EnviadaEm" IS NOT NULL AND extract(epoch from "t4EnviadaEm")::numeric % 86400 = 0',
    'UPDATE "SinirConexao" SET "venceEm" = "venceEm" + interval ''3 hours'' WHERE "venceEm" IS NOT NULL AND extract(epoch from "venceEm")::numeric % 86400 = 0',
    'UPDATE "MtrImaManifesto" SET "dataExpedicao" = "dataExpedicao" + interval ''3 hours'' WHERE "dataExpedicao" IS NOT NULL AND extract(epoch from "dataExpedicao")::numeric % 86400 = 0',
    'UPDATE "MtrImaManifesto" SET "dataRecebimento" = "dataRecebimento" + interval ''3 hours'' WHERE "dataRecebimento" IS NOT NULL AND extract(epoch from "dataRecebimento")::numeric % 86400 = 0'
  ];
  q text;
  n bigint;
BEGIN
  FOREACH q IN ARRAY queries LOOP
    EXECUTE q;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '% -> % linhas', q, n;
  END LOOP;
END $$;