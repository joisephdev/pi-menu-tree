# Pi Menu Tree

A hierarchical slash-command menu for [Pi](https://pi.dev). It turns the flat `/` command list into keyboard-navigable categories without leaving the terminal.

## Features

- Shows a category menu immediately when you type `/`.
- Groups commands into **Native commands**, **Extensions**, **Skills**, and **Prompt templates**.
- Opens each group as an inline submenu beneath Pi's editor.
- Uses `Esc` for navigation: submenu → root menu → editor.
- Preserves Pi's native command and path autocomplete when you type a command directly, such as `/model` or `/skill:typescript`.

## Usage

1. Type `/` in Pi. The root menu opens immediately.
2. Use `↑` / `↓` and `Enter` to select a category.
3. Select a command from its submenu.
4. The command is placed in the editor. Press `Enter` once to run it, exactly as with Pi's native autocomplete.

```text
⚙ Native commands
🧩 Extensions
🧠 Skills
📋 Prompt templates
```

Press `Esc` in a submenu to return to the categories, or press `Esc` in the root menu to close it.

## Installation

### npm

After publishing:

```bash
pi install npm:pi-menu-tree
```

### From a Git repository

```bash
pi install git:github.com/<YOUR_GITHUB_USER>/pi-menu-tree
```

### Local development

```bash
pi install ./pi-menu-tree
```

Restart Pi or run `/reload` after installing or updating the package.

## How it works

Pi Menu Tree decorates the active editor through Pi's public editor API. It retains the underlying editor's styling and application shortcuts, delegating all autocomplete except the exact `/` input, which opens this package's menu tree.

## Compatibility

- Pi with extension support.
- Node.js 20 or later.
- Compatible with custom editors such as `@sting8k/pi-droid-styling`; install Pi Menu Tree after the styling extension so it can decorate that editor.

## Security

Pi extensions execute with your user permissions. Review the source before installing from a third-party repository.

## License

[MIT](LICENSE)
