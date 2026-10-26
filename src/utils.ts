/**
 * Hides or shows the explorer row of a single path.
 *
 * The path is escaped before it goes into the selector: macOS leaves an `Icon\r`
 * file in folders that have a custom icon, and Obsidian lists it. A raw `\r`
 * inside an attribute selector is invalid, `querySelector` throws, and the
 * caller never gets to record the path — which is why the original 1.1.1 build
 * did nothing at all and left the hidden list empty.
 */
export function changePathVisibility(path: string, hide: boolean) {
	let escapedPath = CSS.escape(path);
	let n = document.querySelector(`[data-path="${escapedPath}"]`);
	if (!n) {
		return;
	};
	let p = n.parentElement
	if (hide) {
		p.style.display = `none`
	} else {
		p.style.display = ``;
	};
};

/** Marks the rows hidden by a pattern, so they can be restored when it goes. */
const PATTERN_MARK = `oaFhPatternHidden`;

/**
 * Compiles one pattern, or returns null when it is empty or not a valid
 * regular expression. Invalid patterns are ignored rather than thrown: a typo
 * in the settings must never break the explorer.
 */
export function compilePattern(source: string): RegExp | null {
	const text = source.trim();
	if (text === ``) {
		return null;
	}
	try {
		return new RegExp(text);
	} catch (e) {
		return null;
	}
};

/** Whether any of the patterns matches the given path. */
export function patternMatches(path: string, patterns: string[]): boolean {
	return patterns.some((source) => {
		const re = compilePattern(source);
		return re !== null && re.test(path);
	});
};

/** The rows the patterns are allowed to touch: everything but the vault root. */
function explorerPaths(): { row: HTMLElement, path: string }[] {
	const found: { row: HTMLElement, path: string }[] = [];
	const nodes = document.querySelectorAll<HTMLElement>(`.nav-files-container [data-path]`);
	nodes.forEach((node) => {
		const path = node.getAttribute(`data-path`);
		const row = node.parentElement as HTMLElement | null;
		if (!path || !row || path === `/`) {
			return;
		}
		found.push({ row, path });
	});
	return found;
};

/**
 * Applies every pattern to the explorer. Rows that stop matching are restored,
 * but only when the plugin was the one hiding them: a row hidden by hand (or by
 * another plugin) is left alone.
 */
export function applyPatternVisibility(patterns: string[], hide: boolean) {
	for (const { row, path } of explorerPaths()) {
		const matched = patternMatches(path, patterns);
		if (hide && matched) {
			row.dataset[PATTERN_MARK] = `1`;
			row.style.display = `none`;
		} else if (row.dataset[PATTERN_MARK] === `1`) {
			delete row.dataset[PATTERN_MARK];
			if (row.style.display === `none`) {
				row.style.display = ``;
			}
		}
	}
};

/** How many explorer rows a pattern currently matches. Used by the modal. */
export function countPatternMatches(pattern: string): number {
	const re = compilePattern(pattern);
	if (re === null) {
		return 0;
	}
	return explorerPaths().filter(({ path }) => re.test(path)).length;
};
