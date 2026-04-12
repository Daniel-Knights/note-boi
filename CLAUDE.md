# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm run dev          # Desktop app (Tauri)
pnpm run dev:web      # Web only (Vite)

# Build
pnpm run build        # Production desktop build
pnpm run build:web    # Production web build

# Lint & type check
pnpm run lint         # ESLint + vue-tsc + tsc

# Format
pnpm run format       # Prettier (writes to ./src)

# Tests
pnpm run test                     # Run all tests once
pnpm run test:watch               # Watch mode
pnpm run test:update              # Update snapshots
pnpm run test -- path/to/file     # Single test file
pnpm run test -- --grep "pattern" # Tests matching pattern
```

## Architecture

Note-Boi is a cross-platform (Tauri desktop + PWA) note-taking app with client-side end-to-end encryption and remote sync.

### Layers

**Vue 3 UI** (`src/components/`) → **Store/Composables** (`src/store/`) → **I/O Actions** (`src/store/note/io/`) → **API Layer** (`src/api/`) → **Classes** (`src/classes/`)

The store also invokes Tauri commands (Rust backend in `src-tauri/`) for desktop file I/O.

### Key modules

- **`src/store/note/`** — Reactive note and selection state (`state.ts`), plus I/O actions (`io/`) that call Tauri commands for local persistence then queue a server sync.
- **`src/store/sync.ts`** — Auth state, encryption key cache, and sync loading state.
- **`src/api/notes.ts`** — Sync logic: encrypts notes via `Encryptor`, posts to `/notes/sync`, diffs the server response to update local state.
- **`src/api/auth.ts`** — Login/signup/logout; on login calls `Encryptor.generatePasswordKey()` to derive the encryption key from the user's password.
- **`src/classes/encryptor.ts`** — WebCrypto AES-GCM encryption with PBKDF2 key derivation. All encryption is client-side only.
- **`src/classes/keyStore.ts`** / **`tokenStore.ts`** — Persist the encryption key (IndexedDB + system keyring on desktop) and access token.
- **`src/classes/note.ts`** — Note data model; stores content as Quill Delta.
- **`src/constant.ts`** — Central definitions for API endpoint types, Tauri command names, and UI constants.
- **`src/utils.ts`** — Platform detection and Tauri abstraction helpers.

### Data flow: edit → sync

1. User edits in `Editor.vue` → `editNote` action (`store/note/io/editNote.ts`) → Tauri `edit_note` command (local file write)
2. `queueSync()` is called → `api/notes.ts sync()` encrypts notes with `Encryptor` → POST `/notes/sync`
3. Server returns a note diff → `updateLocalNoteStateFromDiff` reconciles local state

### Platform differences

`src/utils.ts` exposes `isWeb()` and `isDesktop()` and wraps Tauri APIs so the same store code runs in both desktop and web modes. Web mode uses IndexedDB/localStorage in place of Tauri commands and the system keyring.

### Testing setup

Tests run in jsdom with `fake-indexeddb` for IndexedDB, and Tauri APIs mocked in `src/__tests__/mock/`. See `src/__tests__/setup.ts` for global mock initialization.
