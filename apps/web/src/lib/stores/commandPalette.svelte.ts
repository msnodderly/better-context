import { getContext, setContext } from 'svelte';

const COMMAND_PALETTE_KEY = Symbol('commandPalette');

class CommandPaletteStore {
	isOpen = $state(false);
	initialQuery = $state('');

	open(query = '') {
		this.initialQuery = query;
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
		this.initialQuery = '';
	}

	toggle() {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}
}

export const setCommandPaletteStore = () => {
	const store = new CommandPaletteStore();
	setContext(COMMAND_PALETTE_KEY, store);
	return store;
};

export const getCommandPaletteStore = (): CommandPaletteStore => {
	const store = getContext<CommandPaletteStore>(COMMAND_PALETTE_KEY);
	if (!store)
		throw new Error('CommandPaletteStore not found. Call setCommandPaletteStore() in a parent.');
	return store;
};
