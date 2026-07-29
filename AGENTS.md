<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Schema Changes (ativo field)
Campo `ativo` (Boolean @default(true)) adicionado aos modelos: Cliente, Empreendimento, Processo, Documento, Tarefa, Exigencia, Financeiro.

**Necessário rodar para sincronizar o banco:**
```
npx prisma db push
```
Ou, se preferir migration versionada:
```
npx prisma migrate dev --name add-ativo-to-all-entities
```
