# 語録 (goroku)

A personal Japanese knowledge notebook for N1-level reading and writing study. Capture vocabulary, grammar patterns, and expressions as you meet them, review them with quick flashcard sessions, and explore how they relate in an interactive knowledge graph.

The interface is entirely in Japanese, light mode only. All data stays on your machine; the only network traffic is the optional AI features, which call an LLM API you configure yourself.

## Features

- **Three entry types** — 単語 (vocabulary), 文型 (grammar patterns, with structured 接続ルール), and 慣用句・ことわざ (phrases). Each has multiple meanings, register tags, example sentences with optional sources, and notes.
- **Spreadsheet view** — sortable, filterable tables per entry type; click a row to open the detail drawer.
- **Paste-to-fill** — paste a passage explaining a word or pattern into 新規追加 and the AI fills in the form for you to review and save. Only 読み方 and each example's 訳 are generated when missing; everything else comes from the passage or stays empty.
- **Unified knowledge graph** — one graph across all entry types with cross-type connections (`SAME_KANJI`, `RELATED`, `CONTRAST`, `REGISTER_PAIRED`, `OTHER`), neighborhood and full-graph modes, and type filters.
- **Connection suggestions** — after saving an entry, rule-based kanji matching and an LLM propose connections for you to confirm or dismiss.
- **Quiz** — 5-item sessions drawn from a priority queue across all entry types: term → meaning, meaning → term, and example self-grading.
- **Search** — term-only or full-text, from every view.
- **Backup** — export as `.sqlite`, `.json`, or per-type `.csv`; import from `.sqlite` or `.json`; optional automatic mirroring to a folder (e.g. iCloud Drive or Dropbox).

## Getting started

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default <http://localhost:5173>).

### AI setup

Open **設定** and enter an OpenAI-compatible endpoint, a model name, and your API key. This powers both connection suggestions and paste-to-fill. The key is stored in the webview's `localStorage` and is never included in exports.

### Other scripts

```bash
npm run build     # typecheck (tsc -b) and production build
npm run lint      # oxlint
npm run preview   # serve the production build
```

## Desktop app (macOS)

goroku ships as a [Tauri v2](https://tauri.app) app using the system WebKit, producing a ~12 MB `.app` and a ~4 MB `.dmg`. Building needs a [Rust toolchain](https://rustup.rs) in addition to Node.

1. Create your local bundle-identifier override (gitignored):

   ```bash
   cp src-tauri/tauri.macos.conf.json.example src-tauri/tauri.macos.conf.json
   ```

   Edit `identifier` to something of your own and keep it stable. The identifier determines where the app's data lives, so changing it later makes existing data appear to vanish.

2. Build:

   ```bash
   npm run tauri build
   ```

   Output is in `src-tauri/target/release/bundle/` (`macos/goroku.app` and `dmg/goroku_0.1.0_aarch64.dmg`). The first build compiles all Rust dependencies and takes a few minutes; later builds are much faster.

Use `npm run tauri dev` for a native window against the dev server.

## Data and backups

- The database is SQLite (`@sqlite.org/sqlite-wasm`) running in memory and snapshotted to the browser's Origin Private File System after each change, with IndexedDB as a fallback. No server is involved.
- If a save to storage fails, a red banner appears at the top of the app.
- **Back up regularly.** In 設定, export a `.sqlite` or `.json` file, or pick a backup folder so every change is mirrored automatically.
- Browser and desktop-app data are separate: the dev server's data (in your browser) is not the packaged app's data. Move data between them with export/import.

## Tech stack

React 19, Vite, TypeScript, Tailwind CSS, AG Grid Community, Cytoscape.js with the `fcose` layout, SQLite WASM, and Tauri v2.

## Project layout

```
src/
  components/   entry forms, drawers, graph, connections, quiz, layout
  config/       option lists: connection types, entry types, 品詞, 使用域, 接続ルール
  db/           SQLite setup, schema, OPFS worker, query modules
  services/     AI client, entry parsing, suggestions, export, backup, quiz engine
  views/        Spreadsheet, Graph, Quiz, Settings
src-tauri/      Tauri shell, capabilities, icons, bundle config
```

The option lists in `src/config/` are plain data, so adding a connection type, part of speech, or attachment form is a small edit there.

## Made with Claude Code

This project was built with [Claude Code](https://claude.com/claude-code).
