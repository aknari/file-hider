# File Hider

Hide files and folders from Obsidian's file explorer, either by picking them one
by one or with **regular expressions**.

This is a fork of [Oliver Akins' File Hider](https://github.com/eldritch-oliver/file-hider)
(MIT). The original has been inactive since 2023 and its published build predates
the fix for a bug that makes the plugin fail on some files; the fork picks up
`main`, fixes that, and adds the pattern list.

## Why the published plugin fails on `Icon`

Up to 1.1.1, hiding a row was:

```js
document.querySelector(`[data-path="${path}"]`).parentElement.style.display = 'none';
```

macOS leaves an `Icon\r` file in any folder that has a custom icon, and Obsidian
lists it in the explorer. A raw carriage return inside an attribute selector is
invalid CSS: `querySelector` throws, the exception aborts the click handler
before `hiddenList.push(...)` and `saveSettings()` run, and the result is that
**the file is not hidden and the hidden list stays empty**.

The fix (`CSS.escape(path)`, upstream PR #30) was merged in January 2024 and
never released. This fork starts from that `main`.

## Install

Download `main.js` and `manifest.json` from the latest release and put them in
`<vault>/.obsidian/plugins/OA-file-hider/`, then enable the plugin in
*Settings → Community plugins*. The plugin id is unchanged, so it replaces the
store build and keeps existing settings.

With [BRAT](https://github.com/TfTHacker/obsidian42-brat), add this repository
and let it track the releases.

## Usage

- **Hide one file or folder**: right-click it in the explorer and choose
  `Hide File` / `Hide Folder`. The path goes to the hidden list.
- **Unhide**: right-click it again (it is visible while the reveal switch is on)
  and choose `Unhide`, or remove it from *Settings → File Hider → Manage*.
- **Reveal everything without losing the list**: the `Show hidden files and
  folders` switch at the top of the settings tab. Off means hidden, which is the
  normal state.
- **Patterns**: *Settings → File Hider → Manage* has a second list. Add a regular
  expression and every file or folder whose **path** matches it disappears.

## Patterns

- Matching runs against the full path, e.g. `01-inbox/nota.md`, and is
  case-sensitive.
- `^Icon` covers the macOS file above; `\.tmp$` covers an extension; `^90-`
  covers a folder prefix and, with it, everything inside.
- Any pattern matching is enough; order does not matter.
- Invalid expressions are rejected when added, and ignored if they reach
  `data.json` some other way.
- Each row shows how many explorer rows it matches right now, so a typo is
  obvious before going hunting for the file.
- Removing a pattern restores only the rows that pattern was hiding.
- The hand-picked list wins: a path in both stays hidden, and `Unhide` on a path
  that also matches a pattern will not keep it visible — remove the pattern too.

Rows are re-applied after Obsidian repaints the explorer (expanding a folder,
switching workspaces), so hidden items do not come back. The plugin is cosmetic:
hidden files remain searchable and still appear in the graph view.

## Build

```bash
npm install
npm run typecheck
npm run build      # dist/main.js
OBSIDIAN_PLUGIN_DIR=/path/to/vault/.obsidian/plugins/OA-file-hider npm run deploy
```

`main.js` is not committed; releases carry it, as in the original repository.

## License

MIT, © 2022 Oliver Akins. See [LICENSE.txt](LICENSE.txt).
