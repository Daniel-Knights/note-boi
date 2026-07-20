# Copilot Cloud Agent Instructions

## Project Overview

NoteBoi is a cross-platform notes app (desktop via Tauri + web via PWA) that syncs notes across devices with E2E encryption. The frontend is Vue 3 + TypeScript; the backend/desktop shell is Rust (Tauri v2).

## Repository Layout

```
src/                  # Vue 3 frontend (TypeScript)
├── components/       # Vue SFCs (.vue)
├── store/            # App state (note, sync, theme, popup, update)
├── classes/          # Core domain classes (Note, Encryptor, KeyStore, etc.)
├── composables/      # Vue composables
├── api/              # API layer for server communication
├── sass/             # SCSS styles
├── __tests__/        # Vitest test suite
│   ├── mock/         # Tauri/IPC mocks
│   ├── utils/        # Test helpers
│   └── src/          # Tests mirroring src/ structure
src-tauri/            # Tauri v2 Rust backend
├── src/
│   ├── commands/     # Tauri IPC commands
│   ├── note.rs       # Note model
│   ├── menu.rs       # App menu
│   └── utils/        # Rust utilities
├── Cargo.toml
└── tauri.conf.json
```

## Prerequisites

- **Node.js** >= 22
- **pnpm** 11.4.0 (enforced via `packageManager` field)
- **Rust** toolchain (1.89.0 used in CI) for Tauri builds

## Common Commands

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Run frontend dev server | `pnpm run vite:dev` |
| Run full Tauri dev | `pnpm run dev` |
| Run web dev server | `pnpm run dev:web` |
| Lint (ESLint + vue-tsc + tsc) | `pnpm run lint` |
| Run tests | `pnpm run test` |
| Run tests in watch mode | `pnpm run test:watch` |
| Update test snapshots | `pnpm run test:update` |
| All checks (lint + test) | `pnpm run checks` |
| Format code | `pnpm run format` |
| Build desktop | `pnpm run build` |
| Build web | `pnpm run build:web` |
| Rust format | `cd src-tauri && cargo fmt` |
| Rust lint | `cd src-tauri && cargo clippy` |

## Tech Stack

- **Frontend**: Vue 3 (Composition API, `<script setup>`), TypeScript (strict mode, `noUncheckedIndexedAccess`)
- **Rich text editor**: Quill
- **Build tool**: Vite 7
- **Desktop framework**: Tauri v2
- **Test framework**: Vitest (jsdom environment, globals enabled)
- **Linting**: ESLint (flat config), vue-tsc, tsc
- **Formatting**: Prettier (single quotes, trailing commas, 90 print width, 2-space indent)
- **Import sorting**: `@trivago/prettier-plugin-sort-imports` (relative paths sorted by depth)
- **Package manager**: pnpm (strict, workspace-aware)
- **Rust formatting**: rustfmt (100 max width, 2-space indent)

## Coding Conventions

### TypeScript/Vue

- Strict TypeScript with `noUncheckedIndexedAccess` enabled
- Single quotes, trailing commas (es5), semicolons, 2-space indentation
- Prefer `const`; no `var`; `eqeqeq` enforced
- No `for..in` loops — use `Object.keys/values/entries`
- No `++`/`--` operators — use `+= 1` / `-= 1`
- No bitwise operators
- camelCase for variables/functions; no leading underscores (except `__dirname`/`__filename`)
- Imports are auto-sorted by Prettier plugin — don't manually reorder
- No CommonJS (`require`/`module.exports`) — ESM only
- Vue components use `<script setup lang="ts">` with Composition API
- Global test helpers (`describe`, `it`, `expect`, `vi`, `beforeEach`, etc.) available without import

### Rust

- Edition 2021
- 2-space indentation, 100 char max width
- Imports grouped at crate level (`imports_granularity = "Crate"`)

## Testing

- Tests live in `src/__tests__/src/` mirroring the source structure
- Test setup (`src/__tests__/setup.ts`) mocks Tauri window APIs, IndexedDB, ResizeObserver, and matchMedia
- Uses `fake-indexeddb` for IndexedDB simulation
- `@tauri-apps/api/mocks` provides Tauri IPC mocking
- Tests run with `fileParallelism: false` to reduce flakiness
- Snapshot tests exist — run `pnpm run test:update` after intentional output changes
- Timeout: 30s for both hooks and tests

## Known Considerations

- The `pnpm run lint` command runs three separate checks: ESLint, vue-tsc, and tsc. All three must pass.
- Tauri commands are defined in `src-tauri/src/commands/` and registered in `src-tauri/src/lib.rs`.
- The app has two build targets: desktop (Tauri, `vite.config.ts`) and web (PWA, `vite.config.web.ts`). The `APP_ENV` env var distinguishes them (`'desktop'` vs `'web'`).
- Server URL is compile-time defined via Vite's `define` option.
- CI only runs on release tags (`v*`) — there is no PR CI workflow.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (angular preset).

## Troubleshooting

- If `pnpm install` fails, ensure you're using pnpm 11.4.0 exactly (check `packageManager` field).
- If Tauri build fails on Linux, install system dependencies: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`.
- If tests are flaky, they already run with `fileParallelism: false`. Increasing `hookTimeout`/`testTimeout` (currently 30s) may help.
