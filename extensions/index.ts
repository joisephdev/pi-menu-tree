import { CustomEditor, type ExtensionAPI, type SlashCommandSource } from "@earendil-works/pi-coding-agent";
import {
  Key,
  matchesKey,
  SelectList,
  truncateToWidth,
  type AutocompleteProvider,
  type EditorComponent,
  type EditorTheme,
  type SelectItem,
  type TUI,
} from "@earendil-works/pi-tui";

const CATEGORY = {
  BUILTIN: "builtin",
  EXTENSION: "extension",
  SKILL: "skill",
  PROMPT: "prompt",
} as const;

const CATEGORIES = [
  CATEGORY.BUILTIN,
  CATEGORY.EXTENSION,
  CATEGORY.SKILL,
  CATEGORY.PROMPT,
] as const;

type CommandCategory = (typeof CATEGORIES)[number];

interface CategoryPresentation {
  label: string;
  prefix: string;
}

interface CommandGroups {
  builtin: SelectItem[];
  extension: SelectItem[];
  skill: SelectItem[];
  prompt: SelectItem[];
}

interface FocusableEditor extends EditorComponent {
  focused?: boolean;
}

const CATEGORY_PRESENTATION: Readonly<Record<CommandCategory, CategoryPresentation>> = {
  [CATEGORY.BUILTIN]: { label: "Native commands", prefix: "" },
  [CATEGORY.EXTENSION]: { label: "Extensions", prefix: "" },
  [CATEGORY.SKILL]: { label: "Skills", prefix: "" },
  [CATEGORY.PROMPT]: { label: "Prompt templates", prefix: "" },
};

// pi.getCommands() intentionally excludes these interactive-only commands.
const BUILTIN_COMMANDS: readonly SelectItem[] = [
  { value: "login", label: "login", description: "Manage provider credentials" },
  { value: "logout", label: "logout", description: "Remove provider credentials" },
  { value: "model", label: "model", description: "Switch models" },
  { value: "scoped-models", label: "scoped-models", description: "Manage model cycling" },
  { value: "settings", label: "settings", description: "Configure Pi" },
  { value: "resume", label: "resume", description: "Browse previous sessions" },
  { value: "new", label: "new", description: "Start a new session" },
  { value: "name", label: "name", description: "Set the session name" },
  { value: "session", label: "session", description: "Show session information" },
  { value: "tree", label: "tree", description: "Navigate the session tree" },
  { value: "fork", label: "fork", description: "Fork from a previous message" },
  { value: "clone", label: "clone", description: "Clone the active branch" },
  { value: "compact", label: "compact", description: "Compact conversation context" },
  { value: "copy", label: "copy", description: "Copy the last assistant message" },
  { value: "export", label: "export", description: "Export the session" },
  { value: "import", label: "import", description: "Import a session" },
  { value: "share", label: "share", description: "Share the session" },
  { value: "trust", label: "trust", description: "Manage project trust" },
  { value: "reload", label: "reload", description: "Reload Pi resources" },
  { value: "hotkeys", label: "hotkeys", description: "Show keyboard shortcuts" },
  { value: "changelog", label: "changelog", description: "Show version history" },
  { value: "llama", label: "llama", description: "Manage llama.cpp models" },
  { value: "quit", label: "quit", description: "Quit Pi" },
];

function categoryFromSource(source: SlashCommandSource): CommandCategory {
  if (source === "skill") return CATEGORY.SKILL;
  if (source === "prompt") return CATEGORY.PROMPT;
  return CATEGORY.EXTENSION;
}

function isCategory(value: string): value is CommandCategory {
  return CATEGORIES.some((category) => category === value);
}

function getCommandGroups(pi: ExtensionAPI): CommandGroups {
  const groups: CommandGroups = { builtin: [...BUILTIN_COMMANDS], extension: [], skill: [], prompt: [] };
  for (const command of pi.getCommands()) {
    const category = categoryFromSource(command.source);
    groups[category].push({
      value: command.name,
      label: command.name,
      description: command.description,
    });
  }
  return groups;
}

class MenuTreeEditorDecorator implements EditorComponent {
  private readonly inner: FocusableEditor;
  private readonly tui: TUI;
  private readonly editorTheme: EditorTheme;
  private readonly commandGroups: () => CommandGroups;
  private menu?: SelectList;
  private menuCategory?: CommandCategory;

  constructor(inner: EditorComponent, tui: TUI, theme: EditorTheme, commandGroups: () => CommandGroups) {
    this.inner = inner as FocusableEditor;
    this.tui = tui;
    this.editorTheme = theme;
    this.commandGroups = commandGroups;
  }

  // Pi's setCustomEditorComponent checks for these duck-typed members on the custom editor.
  // If they are missing, app-level keybindings (ctrl+c clear, ctrl+d exit, esc) are not copied
  // from defaultEditor and appear to be "broken". Proxy them to the inner CustomEditor.
  get actionHandlers(): Map<string, () => void> {
    return (this.inner as any).actionHandlers ?? ((this.inner as any).actionHandlers = new Map());
  }
  set actionHandlers(value: Map<string, () => void>) {
    (this.inner as any).actionHandlers = value;
  }
  get onEscape(): (() => void) | undefined {
    return (this.inner as any).onEscape;
  }
  set onEscape(handler: (() => void) | undefined) {
    (this.inner as any).onEscape = handler;
  }
  get onCtrlD(): (() => void) | undefined {
    return (this.inner as any).onCtrlD;
  }
  set onCtrlD(handler: (() => void) | undefined) {
    (this.inner as any).onCtrlD = handler;
  }
  get onPasteImage(): (() => void) | undefined {
    return (this.inner as any).onPasteImage;
  }
  set onPasteImage(handler: (() => void) | undefined) {
    (this.inner as any).onPasteImage = handler;
  }
  get onExtensionShortcut(): ((data: string) => boolean) | undefined {
    return (this.inner as any).onExtensionShortcut;
  }
  set onExtensionShortcut(handler: ((data: string) => boolean) | undefined) {
    (this.inner as any).onExtensionShortcut = handler;
  }
  onAction(action: string, handler: () => void): void {
    if (typeof (this.inner as any).onAction === "function") {
      (this.inner as any).onAction(action, handler);
    } else {
      this.actionHandlers.set(action, handler);
    }
  }

  get focused(): boolean {
    return this.inner.focused ?? false;
  }

  set focused(value: boolean) {
    this.inner.focused = value;
  }

  get onSubmit(): ((text: string) => void) | undefined {
    return this.inner.onSubmit;
  }

  set onSubmit(handler: ((text: string) => void) | undefined) {
    this.inner.onSubmit = handler;
  }

  get onChange(): ((text: string) => void) | undefined {
    return this.inner.onChange;
  }

  set onChange(handler: ((text: string) => void) | undefined) {
    this.inner.onChange = handler;
  }

  get borderColor(): ((text: string) => string) | undefined {
    return this.inner.borderColor;
  }

  set borderColor(color: ((text: string) => string) | undefined) {
    this.inner.borderColor = color;
  }

  getText(): string {
    return this.inner.getText();
  }

  getExpandedText(): string {
    return this.inner.getExpandedText?.() ?? this.inner.getText();
  }

  setText(text: string): void {
    this.closeMenu();
    this.inner.setText(text);
  }

  addToHistory(text: string): void {
    this.inner.addToHistory?.(text);
  }

  insertTextAtCursor(text: string): void {
    this.inner.insertTextAtCursor?.(text);
  }

  setPaddingX(padding: number): void {
    this.inner.setPaddingX?.(padding);
  }

  setAutocompleteMaxVisible(maxVisible: number): void {
    this.inner.setAutocompleteMaxVisible?.(maxVisible);
  }

  setAutocompleteProvider(provider: AutocompleteProvider): void {
    this.inner.setAutocompleteProvider?.({
      triggerCharacters: provider.triggerCharacters,
      getSuggestions: async (lines, cursorLine, cursorCol, options) => {
        const textBeforeCursor = (lines[cursorLine] ?? "").slice(0, cursorCol);
        if (textBeforeCursor === "/") return null;
        return provider.getSuggestions(lines, cursorLine, cursorCol, options);
      },
      applyCompletion: (lines, cursorLine, cursorCol, item, prefix) =>
        provider.applyCompletion(lines, cursorLine, cursorCol, item, prefix),
      shouldTriggerFileCompletion: (lines, cursorLine, cursorCol) =>
        provider.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true,
    });
  }

  handleInput(data: string): void {
    if (!this.menu && data === "/" && this.inner.getText() === "") {
      this.inner.handleInput(data);
      this.openRootMenu();
      return;
    }

    if (this.menu) {
      // Only SelectList navigation goes to the menu. Any other key — especially
      // app-level bindings like ctrl+c (app.clear), ctrl+d (app.exit) or esc
      // (app.interrupt) — must close the menu and propagate to the inner
      // CustomEditor so Pi can clear/exit/interrupt. Previously everything was
      // swallowed by menu.handleInput, breaking global bindings.
      const isMenuNavigation =
        matchesKey(data, Key.up) ||
        matchesKey(data, Key.down) ||
        matchesKey(data, Key.enter) ||
        matchesKey(data, "pageUp") ||
        matchesKey(data, "pageDown");

      if (isMenuNavigation) {
        this.menu.handleInput(data);
        this.tui.requestRender();
        return;
      }

      // ctrl+c / esc should both close the menu and reach app handlers.
      // Letting them fall through to the generic close+forward below makes a
      // single ctrl+c from "/" close the menu AND clear the editor, so a
      // quick double ctrl+c still exits (handleCtrlC 500ms window).
      if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
        this.closeMenu();
        this.inner.handleInput(data);
        return;
      }

      if (matchesKey(data, Key.backspace)) {
        this.closeMenu();
        this.inner.handleInput(data);
        return;
      }

      // Any other key (printable, ctrl+*, etc.) closes the menu and propagates.
      // Previously only checked root menu with data.length===1, which broke
      // Kitty protocol (ctrl+c = \x1b[99;5u) and sub-menu typing.
      this.closeMenu();
      this.inner.handleInput(data);
      return;
    }

    this.inner.handleInput(data);
  }

  render(width: number): string[] {
    const lines = this.inner.render(width);
    if (!this.menu) return lines;

    const presentation = this.menuCategory ? CATEGORY_PRESENTATION[this.menuCategory] : undefined;
    const title = presentation
      ? `${presentation.prefix ? `${presentation.prefix} ` : ""}${presentation.label}  ·  Esc to go back`
      : "Select a command group  ·  Esc to close";

    return [
      ...lines,
      truncateToWidth(title, width),
      ...this.menu.render(width),
    ];
  }

  invalidate(): void {
    this.inner.invalidate();
    this.menu?.invalidate();
  }

  private openRootMenu(): void {
    const groups = this.commandGroups();
    const items = CATEGORIES
      .map((category) => ({ category, commands: groups[category] }))
      .filter(({ commands }) => commands.length > 0)
      .map(({ category, commands }) => {
        const presentation = CATEGORY_PRESENTATION[category];
        const count = commands.length;
        return {
          value: category,
          label: presentation.prefix ? `${presentation.prefix} ${presentation.label}` : presentation.label,
          description: `${count} command${count === 1 ? "" : "s"}`,
        };
      });

    this.menuCategory = undefined;
    this.menu = this.createMenu(
      items,
      (item) => {
        if (isCategory(item.value)) this.openCommandMenu(item.value);
      },
      () => this.closeMenu(),
    );
    this.tui.requestRender();
  }

  private openCommandMenu(category: CommandCategory): void {
    this.menuCategory = category;
    this.menu = this.createMenu(
      this.commandGroups()[category],
      (item) => {
        this.closeMenu();
        // Auto-execute: set the slash command and submit immediately so the
        // user doesn't need a 4th Enter ("/" -> category -> command -> Enter).
        this.inner.setText(`/${item.value}`);
        this.inner.handleInput("\r");
      },
      () => this.openRootMenu(),
    );
    this.tui.requestRender();
  }

  private createMenu(
    items: SelectItem[],
    onSelect: (item: SelectItem) => void,
    onCancel: () => void,
  ): SelectList {
    const menu = new SelectList(items, Math.min(items.length, 10), this.editorTheme.selectList);
    menu.onSelect = onSelect;
    menu.onCancel = onCancel;
    return menu;
  }

  private closeMenu(): void {
    this.menu = undefined;
    this.menuCategory = undefined;
    this.tui.requestRender();
  }
}

export default function piMenuTree(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const currentEditorFactory = ctx.ui.getEditorComponent();
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      const inner = currentEditorFactory?.(tui, theme, keybindings)
        ?? new CustomEditor(tui, theme, keybindings);
      return new MenuTreeEditorDecorator(inner, tui, theme, () => getCommandGroups(pi));
    });
  });
}
