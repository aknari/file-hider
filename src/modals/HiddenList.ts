import { Modal, Notice, Setting } from "obsidian";
import FileHider from "../main";
import { compilePattern, countPatternMatches } from "../utils";

export class HiddenPathsModal extends Modal {
	private plugin: FileHider;
	private draft = ``;

	constructor(plugin: FileHider) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen() {
		this.render();
	}

	/** Rebuilt after every change so counts and rows stay in sync. */
	private render() {
		const { contentEl: content } = this;
		content.empty();
		content.createEl(`h1`, { text: `Hidden Files and Folders` });
		content.createEl(`hr`);

		let body = content.createEl(`div`, { cls: `hidden-list-modal-body` });
		if (this.plugin.settings.hiddenList.length === 0) {
			body.createEl(`p`, { text: `No files or folders hidden by hand.` });
		}
		this.plugin.settings.hiddenList.forEach(path => {
			let c = body.createEl(`div`);
			new Setting(c)
			.setName(path)
			.addButton(btn => {
				btn.setIcon(`cross`)
				.setTooltip(`Remove`)
				.onClick((e) => {
					this.plugin.unhidePath(path);
					c.hide();
				});
			});
		});

		this.renderPatterns(content);
	}

	/**
	 * The regex section. A pattern hides every file or folder whose path
	 * matches it, so `^Icon` covers the macOS `Icon\r` file that has no
	 * extension and cannot be picked reliably by name.
	 */
	private renderPatterns(content: HTMLElement) {
		content.createEl(`hr`);
		content.createEl(`h2`, { text: `Patterns (regular expressions)` });
		content.createEl(`p`, {
			cls: `setting-item-description`,
			text: `Every file or folder whose path matches any of these is hidden. ` +
				`Matching is case-sensitive; invalid expressions are ignored.`,
		});

		const list = content.createEl(`div`);
		if (this.plugin.settings.patterns.length === 0) {
			list.createEl(`p`, { text: `No patterns yet.` });
		}
		this.plugin.settings.patterns.forEach(pattern => {
			const valid = compilePattern(pattern) !== null;
			const matches = valid ? countPatternMatches(pattern) : 0;
			let c = list.createEl(`div`);
			new Setting(c)
			.setName(pattern)
			.setDesc(valid
				? `${matches} ${matches === 1 ? `match` : `matches`} right now`
				: `Invalid regular expression — ignored`)
			.addButton(btn => {
				btn.setIcon(`cross`)
				.setTooltip(`Remove pattern`)
				.onClick(async () => {
					await this.plugin.removePattern(pattern);
					this.render();
				});
			});
		});

		const draft = this.draft;
		new Setting(content)
		.setName(`Add pattern`)
		.setDesc(`For example ^Icon or \\.tmp$`)
		.addText(text => {
			text
			.setPlaceholder(`^Icon`)
			.setValue(draft)
			.onChange(value => { this.draft = value; });
			text.inputEl.addEventListener(`keydown`, (event) => {
				if (event.key === `Enter`) {
					event.preventDefault();
					this.submitPattern();
				}
			});
		})
		.addButton(btn => {
			btn.setButtonText(`Add`)
			.setCta()
			.onClick(() => this.submitPattern());
		});
	}

	private async submitPattern() {
		const source = this.draft.trim();
		if (source === ``) {
			return;
		}
		if (compilePattern(source) === null) {
			new Notice(`Invalid regular expression: ${source}`);
			return;
		}
		if (this.plugin.settings.patterns.includes(source)) {
			new Notice(`That pattern is already in the list.`);
			return;
		}
		await this.plugin.addPattern(source);
		this.draft = ``;
		this.render();
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
