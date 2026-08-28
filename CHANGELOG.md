# Changelog

All notable changes to this project are documented in this file.

## 0.1.2 — 2026-08-28

### Fixed

- Proxy `CustomEditor` app handlers (`actionHandlers`, `onEscape`, `onCtrlD`, `onPasteImage`, `onExtensionShortcut`, `onAction`) to inner editor so `pi`'s `setCustomEditorComponent` copies `app.clear` (`ctrl+c`), `app.exit` (`ctrl+d`) and `app.interrupt` (`esc`) — previously broke all global keybindings even with menu closed.
- `handleInput` no longer swallows global shortcuts when menu is open: only `up/down/enter/esc/ctrl+c/pageUp/pageDown` go to `SelectList`, other keys (including Kitty `decodePrintableKey`) close the menu and propagate to inner `CustomEditor`. Fixes `ctrl+c` and letters being swallowed in sub-menu and with Kitty keyboard protocol.

## 0.1.1 — 2026-08-28

### Added

- Composition with existing custom editors (preserve previous `getEditorComponent` factory).

## 0.1.0 — 2026-08-28

### Added

- Hierarchical slash-command navigation integrated into Pi's editor.
- Root categories for native commands, extensions, skills, and prompt templates.
- Escape-based navigation: submenu → root menu → editor.
- Fallback to Pi's native autocomplete when typing a command name directly.
