import { Setting } from "obsidian";
import FileHider from "../main";

export class VisibilityToggleSetting {

	public static create(plugin: FileHider, container: HTMLElement) {
		return new Setting(container)
		.setName(`Show hidden files and folders`)
		.setDesc(`Reveals everything the plugin is hiding, without removing anything from the lists. Turn it off to hide it again.`)
		.addToggle(toggle => {
			toggle
			// The switch reads "show", so it is on when hiding is off. This is
			// the same value the upstream plugin stored; only the label was
			// backwards.
			.setValue(!plugin.settings.hidden)
			.onChange(() => {
				plugin.toggleVisibility();
			});
		});
	};
};
