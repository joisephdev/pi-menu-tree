# Changelog

All notable changes to this project are documented in this file.

## 0.1.5 — 2026-08-28

### Changed

- Remove category emojis (`⚙` `🧩` `🧠` `📋`) for a more professional appearance. `CATEGORY_PRESENTATION` now uses empty `prefix` and labels render without icons (`extensions/index.ts:46-51,288-319`).

## 0.1.4 — 2026-08-28

### Changed

- Slash-command menu now auto-executes on selection: `"/"` → category → `Enter` on command immediately submits `"/<command>"` via `handleInput("\\r")`, saving the 4th `Enter` (`"/"`, `Enter` category, `Enter` command, `Enter` submit → now 3 steps).

## 0.1.3 — 2026-08-28

### Fixed

- `handleInput` now closes menu and propagates `ctrl+c`/`esc` to inner `CustomEditor` so single `ctrl+c` from `"/"` closes menu and clears editor, allowing quick double `ctrl+c` to exit (`handleCtrlC` 500ms window). Previously required 3 presses when menu was open and `/` remained.
- Remove `decodePrintableKey` import (not exported by `pi-tui` `dist/index.js`, only `decodeKittyPrintable` exists) which caused `TypeError: decodePrintableKey is not a function` crash on `/`. Now all non-navigation keys close menu and propagate generically, still covering Kitty `\\x1b[99;5u`.

## 0.1.2 — 2026-08-28

### Fixed

- Proxy `CustomEditor` app handlers (`actionHandlers`, `onEscape`, `onCtrlD`, `onPasteImage`, `onExtensionShortcut`, `onAction`) to inner editor so `pi`'s `setCustomEditorComponent` copies `app.clear` (`ctrl+c`), `app.exit` (`ctrl+d`) and `app.interrupt` (`esc`) — previously broke all global keybindings even with menu closed.
- `handleInput` no longer swallows global shortcuts when menu is open: only `up/down/enter/pageUp/pageDown` go to `SelectList`, other keys close the menu and propagate to inner `CustomEditor`. Fixes `ctrl+c` and letters being swallowed in sub-menu and with Kitty keyboard protocol.

## 0.1.1 — 2026-08-28

### Added

- Composition with existing custom editors (preserve previous `getEditorComponent` factory).

## 0.1.0 — 2026-08-28

### Added

- Hierarchical slash-command navigation integrated into Pi's editor.
- Root categories for native commands, extensions, skills, and prompt templates.
- Escape-based navigation: submenu → root menu → editor.
- Fallback to Pi's native autocomplete when typing a command name directly.
