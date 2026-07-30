<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Session: Professional improvements (timezone, toast, pagination, sorting, validation, error boundaries, etc.)

## Changes Made

### Infrastructure
- `next.config.ts`: Added `TZ: "America/Sao_Paulo"` env var for Brasília timezone.
- `src/lib/format.ts`: `formatDateTime()` and `formatDate()` utilities with `America/Sao_Paulo` timezone.
- `src/app/layout.tsx`: Wrapped children in `<ToastProvider>`.

### Toast notifications
- `src/components/Toast.tsx`: Custom toast context + component (`ToastProvider`, `useToast`). Types: success, error, info, warning. Auto-dismiss 4s. Fixed bottom-right positioning.
- Replaced all `alert()` calls with `toast()` in: `DataTable.tsx`, `EditEntityForm.tsx`, `RowActions.tsx`, `DeleteButton.tsx`, `EntityActions.tsx`, `DMR/page.tsx`, `documentos/novo/page.tsx`, `usuarios/[id]/page.tsx`.

### Error boundaries & loading
- `src/app/error.tsx`: Error boundary with retry + home link.
- `src/app/not-found.tsx`: Custom 404 page.
- `src/app/loading.tsx`: Root loading state with spinner.

### DataTable (sorting + pagination)
- `src/components/DataTable.tsx`: Added `sortable`/`sortKey` to columns, click-to-sort with arrow indicators. Added pagination (page size 20, prev/next buttons, "X registro(s) — Página Y de Z"). Uses `useToast`.
- All 7 table components updated with `sortable: true, sortKey: "field"` on appropriate columns.

### EditEntityForm (validation + success feedback + unsaved changes)
- `src/components/EditEntityForm.tsx`: Added `validate` callback per field config, field-level error messages (red border + text), `dirty` state with `beforeunload` listener, `method` prop ("POST"/"PUT"), uses `useToast` for success/error feedback.

### Novo pages standardized
- `src/app/clientes/novo/page.tsx`: Now uses `EditEntityForm` with `method="POST"`.
- `src/app/empreendimentos/novo/page.tsx`: Now uses `EditEntityForm` with `method="POST"` and cliente select.
- `src/app/api/empreendimentos/route.ts`: POST route now converts `clienteId` to Number.

### Remaining items (not yet done)
- `generateMetadata` (dynamic page titles) not yet added to sub-pages.
- Breadcrumbs not yet added to individual pages (component exists, ready to use).
- SearchBar/filters not yet added to Exigencias, Tarefas, Financeiro list pages.

## Database Migration Required
Run before `ativo` columns work in production:
```
npx prisma db push
```
