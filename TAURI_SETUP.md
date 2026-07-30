# Tauri Desktop App — Setup Guide

## Pré-requisitos

- **Node.js** ≥ 20
- **Rust** (via [rustup.rs](https://rustup.rs/))
- **Sistema**: Windows (MSVC build tools), macOS (Xcode), ou Linux (webkit2gtk)

## Instalação

```bash
# 1. Instalar dependências Node.js
npm install

# 2. Verificar se o Tauri CLI está disponível
npx tauri --version
```

## Desenvolvimento

```bash
# Iniciar em modo dev (Tauri + Next.js hot reload)
npm run tauri:dev
```

Isso abre uma janela nativa com o app carregando de `http://localhost:3000`.

## Build do instalador

```bash
# Gerar instalador .exe/.msi (Windows), .dmg (macOS), .AppImage (Linux)
npm run tauri:build
```

O instalador será gerado em `src-tauri/target/release/bundle/`.

## Arquitetura

```
┌─────────────────────────────────────────────┐
│              Tauri WebView                   │
│  ┌───────────────────────────────────────┐  │
│  │         Next.js (Static)              │  │
│  │  ┌────────────┐  ┌─────────────────┐  │  │
│  │  │ UI/Pages   │  │ Tauri Adapter   │  │  │
│  │  │            │  │ src/lib/tauri/  │  │  │
│  │  └────────────┘  └───────┬─────────┘  │  │
│  └──────────────────────────┼─────────────┘  │
│                             │ invoke()       │
│  ┌──────────────────────────┼─────────────┐  │
│  │  Rust Backend           │             │  │
│  │  ┌────────────┐  ┌──────┴──────────┐  │  │
│  │  │ Commands   │  │  Sync Engine    │  │  │
│  │  │ lib.rs     │  │  sync.rs        │  │  │
│  │  └─────┬──────┘  └───────┬─────────┘  │  │
│  │        │                 │            │  │
│  │  ┌─────┴──────────────────┴─────────┐  │  │
│  │  │  SQLite Local DB (db.rs)         │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  Cloud Sync ──► POST /api/{entity}/sync       │
│                (quando online)                  │
└────────────────────────────────────────────────┘
```

## Fluxo offline

1. App detecta modo offline via `is_online()` (TCP check no IP 8.8.8.8:53)
2. Todas as operações CRUD vão para SQLite local
3. Cada alteração é enfileirada em `sync_queue.json`
4. Quando online, clique "Sincronizar agora" na barra inferior
5. Sync engine envia operações enfileiradas para a API cloud

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL base da API cloud (ex: `https://nagalli.vercel.app`) |
| `TAURI_BUILD=1` | Ativa modo `output: "export"` no Next.js |

## Estrutura de arquivos Tauri

```
src-tauri/
├── Cargo.toml          # Dependências Rust
├── tauri.conf.json     # Configuração da janela/ícones/bundle
├── build.rs            # Build script
├── capabilities/
│   └── default.json    # Permissões (shell, dialog, fs)
├── icons/              # Ícones do app (.png, .ico, .icns)
└── src/
    ├── main.rs         # Entry point
    ├── lib.rs          # Tauri commands + app setup
    ├── models.rs       # Structs compartilhadas
    ├── db.rs           # SQLite schema + CRUD
    └── sync.rs         # Fila de sincronização offline

src/lib/tauri/
├── index.ts            # Tauri adapter (invoke vs fetch)
├── db.ts               # Unified DB service
└── SyncStatusBar.tsx   # Barra de status online/offline
```
