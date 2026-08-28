import { CustomEditor, type ExtensionAPI, type KeybindingsManager, type SlashCommandSource } from "@earendil-works/pi-coding-agent";
import {
  Key,
  matchesKey,
  SelectList,
  truncateToWidth,
  type AutocompleteProvider,
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

const CATEGORY_PRESENTATION: Readonly<Record<CommandCategory, CategoryPresentation>> = {
  [CATEGORY.BUILTIN]: { label: "Native commands", prefix: "⚙" },
  [CATEGORY.EXTENSION]: { label: "Extensions", prefix: "🧩" },
  [CATEGORY.SKILL]: { label: "Skills", prefix: "🧠" },
  [CATEGORY.PROMPT]: { label: "Prompt templates", prefix: "📋" },
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

function emptyCommandGroups(): CommandGroups {
  return { builtin: [...BUILTIN_COMMANDS], extension: [], skill: [], prompt: [] };
}

function getCommandGroups(pi: ExtensionAPI): CommandGroups {
  const groups = emptyCommandGroups();
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

class HierarchicalSlashEditor extends CustomEditor {
  private readonly commandGroups: () => CommandGroups;
  private readonly editorTheme: EditorTheme;
  private menu?: SelectList;
  private menuCategory?: CommandCategory;

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    commandGroups: () => CommandGroups,
  ) {
    super(tui, theme, keybindings);
    this.editorTheme = theme;
    this.commandGroups = commandGroups;
  }

  override setAutocompleteProvider(provider: AutocompleteProvider): void {
    super.setAutocompleteProvider({
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

  override handleInput(data: string): void {
    if (!this.menu && data === "/" && this.getText() === "") {
      super.handleInput(data);
      this.openRootMenu();
      return;
    }

    if (this.menu) {
      if (matchesKey(data, Key.backspace)) {
        this.closeMenu();
        super.handleInput(data);
        return;
      }

      // Typing a command name keeps Pi's normal `/model`-style autocomplete available.
      if (!this.menuCategory && data.length === 1 && data.charCodeAt(0) >= 32) {
        this.closeMenu();
        super.handleInput(data);
        return;
      }

      this.menu.handleInput(data);
      this.tui.requestRender();
      return;
    }

    // Fallback for a slash inserted programmatically or pasted into the editor.
    if (this.getText() === "/" && matchesKey(data, Key.enter)) {
      this.openRootMenu();
      return;
    }

    super.handleInput(data);
  }

  override render(width: number): string[] {
    const lines = super.render(width);
    if (!this.menu) return lines;

    const presentation = this.menuCategory
      ? CATEGORY_PRESENTATION[this.menuCategory]
      : undefined;
    const title = presentation
      ? `↳ ${presentation.prefix} ${presentation.label}  ·  Esc to go back`
      : "Select a command group  ·  Esc to close";

    return [
      ...lines,
      truncateToWidth(title, width),
      ...this.menu.render(width),
    ];
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
          label: `${presentation.prefix} ${presentation.label}`,
          description: `${count} command${count === 1 ? "" : "s"}`,
        };
      });

    this.menuCategory = undefined;
    this.menu = this.createMenu(items, (item) => {
      if (isCategory(item.value)) this.openCommandMenu(item.value);
    }, () => this.closeMenu());
    this.tui.requestRender();
  }

  private openCommandMenu(category: CommandCategory): void {
    const items = this.commandGroups()[category];
    this.menuCategory = category;
    this.menu = this.createMenu(items, (item) => {
      super.setText(`/${item.value} `);
      this.closeMenu();
    }, () => this.openRootMenu());
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

export default function groupedSlashMenu(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.setEditorComponent((tui, theme, keybindings) =>
      new HierarchicalSlashEditor(tui, theme, keybindings, () => getCommandGroups(pi)),
    );
  });
}
