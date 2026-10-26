import { VisibilityToggleCommand } from './commands/toggleVisibility';
import { VisibilityToggleSetting } from './settings/hiddenToggle';
import { App, Plugin, PluginSettingTab, TFolder } from 'obsidian';
import { ManageHiddenPaths } from './settings/manageHiddenPaths';
import { changePathVisibility, applyPatternVisibility, compilePattern } from './utils';

export interface FileHiderSettings {
	hidden: boolean;
	hiddenList: string[];
	patterns: string[];
};


export default class FileHider extends Plugin {
	settings: FileHiderSettings = {
		hidden: true,
		hiddenList: [],
		patterns: [],
	};

	style: CSSStyleSheet|null = null;

	/** Watches the explorer so hidden rows stay hidden when Obsidian repaints it. */
	private explorerObserver: MutationObserver | null = null;
	private observedContainer: HTMLElement | null = null;
	private applyQueued = false;

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on(`file-menu`, (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem((i) => {
						if (this.settings.hiddenList.includes(file.path)) {
							i.setTitle(`Unhide Folder`)
							.setIcon(`eye`)
							.onClick(() => {
								this.unhidePath(file.path);
							});
						} else {
							i.setTitle(`Hide Folder`)
							.setIcon(`eye-off`)
							.onClick(() => {
								changePathVisibility(file.path, this.settings.hidden);
								this.settings.hiddenList.push(file.path);
								this.saveSettings();
							});
						};
					});
				} else {
					menu.addItem((i) => {
						if (this.settings.hiddenList.includes(file.path)) {
							i.setTitle(`Unhide File`)
							.setIcon(`eye`)
							.onClick((e) => {
								this.unhidePath(file.path);
							});
						} else {
							i.setTitle(`Hide File`)
							.setIcon(`eye-off`)
							.onClick((e) => {
								changePathVisibility(file.path, this.settings.hidden);
								this.settings.hiddenList.push(file.path);
								this.saveSettings();
							});
						};
					});
				};
			})
		);

		this.app.workspace.onLayoutReady(() => 
		{
			// Timeout is used to delay until the file explorer is loaded. Delay of 0 works, but I set it to 200 just to be safe.
			setTimeout(() => {
				this.bindExplorer();
			}, 200);
		});

		// The explorer is rebuilt when the layout changes (new window, workspace
		// switch), so the observer has to follow it.
		this.registerEvent(
			this.app.workspace.on(`layout-change`, () => this.bindExplorer())
		);

		new VisibilityToggleCommand(this);
		this.addSettingTab(new FileHiderSettingsTab(this.app, this));
	};

	onunload() {
		this.explorerObserver?.disconnect();
		this.explorerObserver = null;
		this.observedContainer = null;
	};

	/*
	Loads the config settings, with defaults created where needed.
	*/
	async loadSettings() {
		this.settings = Object.assign({}, this.settings, await this.loadData());
	};

	/* Saves the setting data */
	async saveSettings() {
		await this.saveData(this.settings);
	};

	/*
	Hooks the explorer: re-applies the rules whenever Obsidian adds or removes
	rows, and once right away. Only `childList` is observed on purpose — the
	plugin's own `style.display` changes must not trigger another pass.
	*/
	bindExplorer() {
		const container = document.querySelector<HTMLElement>(`.nav-files-container`);
		if (container === null) {
			return;
		};
		if (container !== this.observedContainer) {
			this.explorerObserver?.disconnect();
			this.observedContainer = container;
			this.explorerObserver = new MutationObserver(() => this.queueApply());
			this.explorerObserver.observe(container, { childList: true, subtree: true });
		};
		this.queueApply();
	};

	/* Coalesces a burst of mutations into one pass. */
	queueApply() {
		if (this.applyQueued) {
			return;
		};
		this.applyQueued = true;
		window.requestAnimationFrame(() => {
			this.applyQueued = false;
			this.applyAll();
		});
	};

	/* Applies both rules. Patterns go first so the hand-picked list wins. */
	applyAll() {
		applyPatternVisibility(this.settings.patterns, this.settings.hidden);
		for (const path of this.settings.hiddenList) {
			changePathVisibility(path, this.settings.hidden);
		};
	};

	/*
	Enables/Disables the file visibility based. (gets the stylesheet if needed)
	*/
	toggleVisibility() {
		this.settings.hidden = !this.settings.hidden;
		this.applyAll();
		this.saveSettings();
	};

	/*
	Adds a regular expression to the list. Returns false when it is empty, not a
	valid expression or already present.
	*/
	async addPattern(source: string): Promise<boolean> {
		const text = source.trim();
		if (text === `` || compilePattern(text) === null) {
			return false;
		};
		if (this.settings.patterns.includes(text)) {
			return false;
		};
		this.settings.patterns.push(text);
		await this.saveSettings();
		this.applyAll();
		return true;
	};

	async removePattern(source: string) {
		const i = this.settings.patterns.indexOf(source);
		if (i === -1) {
			return;
		};
		this.settings.patterns.splice(i, 1);
		await this.saveSettings();
		this.applyAll();
	};

	unhidePath(path: string) {
		let i = this.settings.hiddenList.indexOf(path);
		if (i !== -1) {
			this.settings.hiddenList.splice(i, 1);
		};
		changePathVisibility(path, false);
		// Re-applies the patterns too: a path that also matches one stays hidden,
		// which is the rule the user wrote.
		this.applyAll();
		this.saveSettings();
	};
};


/**
 * All of the settings for the FileHider
 */
class FileHiderSettingsTab extends PluginSettingTab {
	plugin: FileHider;

	constructor(app: App, plugin: FileHider) {
		super(app, plugin);
		this.plugin = plugin;
	};

	display(): void {
		const { containerEl: container } = this;

		container.empty();
		VisibilityToggleSetting.create(this.plugin, container);
		ManageHiddenPaths.create(this.plugin, container);
	};
};
