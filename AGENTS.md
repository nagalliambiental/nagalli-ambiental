<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Session: Bulk selection, ativo field, import/export, navigation restructure

## Changes Made

### SearchBar
- `src/components/SearchBar.tsx`: Changed from `onKeyDown` (Enter-only) to `onChange` with `router.replace` — searches on every keystroke.

### DMR bulk actions
- `src/app/dmr/page.tsx`: Added checkbox column + select all + bulk actions bar (Remover via `DELETE /api/controle-dmr?ids=...`).

### Prisma schema
- `prisma/schema.prisma`: Added `ativo Boolean @default(true)` to all 7 entity models (Cliente, Empreendimento, Processo, Documento, Tarefa, Exigencia, Financeiro).

### Generic DataTable + entity table components
- `src/components/DataTable.tsx`: Client component with checkbox selection, select-all, bulk actions bar (Remover/Ativar/Inativar), empty state, configurable columns, `extraRow` prop for expandable rows.
- `src/components/tables/ClientesTable.tsx` — expandable row shows linked empreendimentos
- `src/components/tables/EmpreendimentosTable.tsx`
- `src/components/tables/ProcessosTable.tsx`
- `src/components/tables/DocumentosTable.tsx`
- `src/components/tables/TarefasTable.tsx`
- `src/components/tables/ExigenciasTable.tsx`
- `src/components/tables/FinanceiroTable.tsx`

All 7 list pages (`app/*/page.tsx`) refactored to use respective table component (server fetch → client table).

### Bulk API endpoints
- All entities have `DELETE` (hard-delete via `deleteMany`) and `PATCH` (update `ativo`) on `app/api/*entity*/route.ts`.

### EditEntityForm improvements
- `src/components/EditEntityForm.tsx`: Added `type: "checkbox"` for ativo toggle (Sim/Não labels).
- Added `search: "cep" | "cnpj"` on field config — renders Buscar button that calls `/api/cep/{cep}` or `/api/cnpj/{cnpj}` and auto-fills mapped form fields.

### Edit pages (ativo field + search)
- All 7 edit pages (`app/*/[id]/editar/page.tsx`) now include ativo checkbox.
- Cliente edit: CNPJ search (`search: "cnpj"`) and CEP search (`search: "cep"`) with Buscar buttons.
- Empreendimento edit: CEP search with Buscar button.

### Navigation restructured
- `src/lib/nav-items.ts`: Grouped Clientes + Empreendimentos under "Cadastros" dropdown group.
- `src/components/Sidebar.tsx`, `MobileNav.tsx`: Renders groups with expand/collapse, active state tracking.

### Import/Export
- `src/app/api/cadastros/exportar/route.ts`: GET → downloads `.xlsx` with Clientes + Empreendimentos sheets.
- `src/app/api/cadastros/importar/route.ts`: POST → accepts `.xlsx` file, upserts clientes by CNPJ, upserts empreendimentos by apelido+cliente.
- `src/app/api/cadastros/modelo/route.ts`: GET → downloads empty template `.xlsx`.
- `src/components/ImportCard.tsx`: Reusable client component with file picker, import progress, export/modelo download buttons.
- `src/app/clientes/page.tsx` + `src/app/empreendimentos/page.tsx`: Added ImportCard above the table.

### ClientesTable expandable rows
- Each cliente row has expand/collapse button showing linked empreendimentos as clickable links.
- Uses `DataTable`'s new `extraRow` prop to render an extra `<tr>` below the data row.

## Database Migration Required
Run before the app will work:
```
npx prisma db push
```
(Or `npx prisma migrate dev --name add-ativo-to-all-entities`)

## Pending
- (none — all planned items completed)
