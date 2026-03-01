<script lang="ts">
	import {
		BookOpen,
		FileText,
		Link,
		MessageSquare,
		Moon,
		Plus,
		Search,
		Settings,
		Sun,
		LifeBuoy,
		CornerDownLeft
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { getCommandPaletteStore } from '$lib/stores/commandPalette.svelte';
	import { getThemeStore } from '$lib/stores/theme.svelte';

	type ThreadItem = {
		_id: string;
		title?: string | null;
		lastActivityAt: number;
		isStreaming?: boolean;
	};

	interface Props {
		threads: ThreadItem[];
		onNewThread: () => void;
		onAddResource: () => void;
		onNavigate: () => void;
	}

	let { threads, onNewThread, onAddResource, onNavigate }: Props = $props();

	const palette = getCommandPaletteStore();
	const themeStore = getThemeStore();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);
	let listRef = $state<HTMLDivElement | null>(null);

	type PaletteItem = {
		id: string;
		label: string;
		sublabel?: string;
		group: string;
		icon: typeof Search;
		action: () => void;
	};

	const actionItems = $derived<PaletteItem[]>([
		{
			id: 'new-thread',
			label: 'New Thread',
			sublabel: 'Start a new conversation',
			group: 'Actions',
			icon: Plus,
			action: () => {
				palette.close();
				onNewThread();
			}
		},
		{
			id: 'add-resource',
			label: 'Add Resource',
			sublabel: 'Connect a git repository',
			group: 'Actions',
			icon: Link,
			action: () => {
				palette.close();
				onAddResource();
			}
		},
		{
			id: 'toggle-theme',
			label: themeStore.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
			sublabel: 'Toggle appearance',
			group: 'Actions',
			icon: themeStore.theme === 'dark' ? Sun : Moon,
			action: () => {
				themeStore.toggle();
				palette.close();
			}
		}
	]);

	const navigationItems: PaletteItem[] = [
		{
			id: 'nav-settings',
			label: 'Settings',
			sublabel: 'Account & preferences',
			group: 'Navigation',
			icon: Settings,
			action: () => {
				palette.close();
				onNavigate();
				goto('/app/settings');
			}
		},
		{
			id: 'nav-resources',
			label: 'Resources',
			sublabel: 'Manage connected repositories',
			group: 'Navigation',
			icon: BookOpen,
			action: () => {
				palette.close();
				onNavigate();
				goto('/app/settings/resources');
			}
		},
		{
			id: 'nav-mcp',
			label: 'MCP Server',
			sublabel: 'API keys & setup',
			group: 'Navigation',
			icon: FileText,
			action: () => {
				palette.close();
				onNavigate();
				goto('/app/settings?tab=mcp');
			}
		},
		{
			id: 'nav-mcp-questions',
			label: 'MCP Questions',
			sublabel: 'View question history',
			group: 'Navigation',
			icon: MessageSquare,
			action: () => {
				palette.close();
				onNavigate();
				goto('/app/settings/questions');
			}
		},
		{
			id: 'nav-support',
			label: 'Support',
			sublabel: 'Help & FAQs',
			group: 'Navigation',
			icon: LifeBuoy,
			action: () => {
				palette.close();
				onNavigate();
				goto('/app/support');
			}
		}
	];

	const filteredItems = $derived.by(() => {
		const q = query.trim().toLowerCase();

		const threadItems: PaletteItem[] = threads
			.filter((t) => {
				if (!q) return false;
				return (t.title ?? t._id).toLowerCase().includes(q);
			})
			.slice(0, 8)
			.map((t) => ({
				id: `thread-${t._id}`,
				label: t.title ?? `Thread ${t._id.slice(0, 8)}...`,
				sublabel: formatDate(t.lastActivityAt),
				group: 'Threads',
				icon: MessageSquare,
				action: () => {
					palette.close();
					onNavigate();
					goto(`/app/chat/${t._id}`);
				}
			}));

		const matchingActions = q
			? actionItems.filter((item) => item.label.toLowerCase().includes(q))
			: actionItems;

		const matchingNav = q
			? navigationItems.filter((item) =>
					[item.label, item.sublabel ?? ''].some((s) => s.toLowerCase().includes(q))
				)
			: navigationItems;

		return [...threadItems, ...matchingActions, ...matchingNav];
	});

	const groupedItems = $derived.by(() => {
		const groups: { name: string; items: PaletteItem[] }[] = [];
		const groupMap = new Map<string, PaletteItem[]>();
		const order = ['Threads', 'Actions', 'Navigation'];

		for (const item of filteredItems) {
			const existing = groupMap.get(item.group);
			if (existing) {
				existing.push(item);
			} else {
				groupMap.set(item.group, [item]);
			}
		}

		for (const name of order) {
			const items = groupMap.get(name);
			if (items && items.length > 0) {
				groups.push({ name, items });
			}
		}

		return groups;
	});

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!palette.isOpen) return;

		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
				scrollToSelected();
				break;
			}
			case 'ArrowUp': {
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				scrollToSelected();
				break;
			}
			case 'Enter': {
				event.preventDefault();
				const item = filteredItems[selectedIndex];
				item?.action();
				break;
			}
			case 'Escape': {
				event.preventDefault();
				palette.close();
				break;
			}
		}
	}

	function scrollToSelected() {
		tick().then(() => {
			const el = listRef?.querySelector(`[data-index="${selectedIndex}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	$effect(() => {
		if (palette.isOpen) {
			query = palette.initialQuery;
			selectedIndex = 0;
			tick().then(() => inputRef?.focus());
		}
	});

	$effect(() => {
		query;
		selectedIndex = 0;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if palette.isOpen}
	<div class="bc-command-overlay" role="presentation">
		<button
			type="button"
			class="bc-command-backdrop"
			onclick={() => palette.close()}
			tabindex="-1"
			aria-label="Close command palette"
		></button>

		<div class="bc-command-dialog" role="dialog" aria-modal="true" aria-label="Command palette">
			<div class="bc-command-input-wrapper">
				<Search size={16} class="bc-command-input-icon" />
				<input
					bind:this={inputRef}
					bind:value={query}
					type="text"
					class="bc-command-input"
					placeholder="Search threads, actions, pages..."
					spellcheck="false"
					autocomplete="off"
				/>
				<kbd class="bc-command-kbd">esc</kbd>
			</div>

			<div class="bc-command-list" bind:this={listRef}>
				{#if filteredItems.length === 0}
					<div class="bc-command-empty">
						No results for "{query}"
					</div>
				{:else}
					{@const flatIndex = { value: 0 }}
					{#each groupedItems as group}
						<div class="bc-command-group">
							<div class="bc-command-group-label">{group.name}</div>
							{#each group.items as item}
								{@const idx = flatIndex.value++}
								<button
									type="button"
									class="bc-command-item"
									class:bc-command-item-active={idx === selectedIndex}
									data-index={idx}
									onmouseenter={() => (selectedIndex = idx)}
									onclick={() => item.action()}
								>
									<div class="bc-command-item-left">
										<item.icon size={16} />
										<div class="bc-command-item-text">
											<span class="bc-command-item-label">{item.label}</span>
											{#if item.sublabel}
												<span class="bc-command-item-sublabel">{item.sublabel}</span>
											{/if}
										</div>
									</div>
									{#if idx === selectedIndex}
										<CornerDownLeft size={14} class="bc-command-item-enter" />
									{/if}
								</button>
							{/each}
						</div>
					{/each}
				{/if}
			</div>

			<div class="bc-command-footer">
				<div class="bc-command-footer-hint">
					<kbd class="bc-command-kbd-sm">&uarr;</kbd>
					<kbd class="bc-command-kbd-sm">&darr;</kbd>
					<span>navigate</span>
				</div>
				<div class="bc-command-footer-hint">
					<kbd class="bc-command-kbd-sm">&crarr;</kbd>
					<span>select</span>
				</div>
				<div class="bc-command-footer-hint">
					<kbd class="bc-command-kbd-sm">esc</kbd>
					<span>close</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.bc-command-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
	}

	.bc-command-backdrop {
		position: absolute;
		inset: 0;
		background: hsl(var(--bc-bg) / 0.75);
		backdrop-filter: blur(4px);
		border: none;
		cursor: default;
	}

	.bc-command-dialog {
		position: relative;
		width: 100%;
		max-width: 560px;
		margin: 0 16px;
		border: 1px solid hsl(var(--bc-border));
		background: hsl(var(--bc-surface));
		box-shadow:
			0 24px 48px hsl(var(--bc-shadow) / 0.2),
			0 0 0 1px hsl(var(--bc-border) / 0.5);
		display: flex;
		flex-direction: column;
		max-height: 420px;
		animation: bc-command-in 120ms ease-out;
	}

	@keyframes bc-command-in {
		from {
			opacity: 0;
			transform: scale(0.98) translateY(-8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.bc-command-input-wrapper {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid hsl(var(--bc-border));
	}

	.bc-command-input-wrapper :global(.bc-command-input-icon) {
		color: hsl(var(--bc-fg-muted));
		flex-shrink: 0;
	}

	.bc-command-input {
		flex: 1;
		background: transparent;
		border: none;
		font-size: 15px;
		color: hsl(var(--bc-fg));
		font-family: var(--font-family-geist);
		outline: none;
	}

	.bc-command-input::placeholder {
		color: hsl(var(--bc-fg-muted) / 0.5);
	}

	.bc-command-kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		min-width: 24px;
		height: 22px;
		border: 1px solid hsl(var(--bc-border));
		background: hsl(var(--bc-bg));
		color: hsl(var(--bc-fg-muted));
		font-size: 11px;
		font-family: var(--font-family-geist);
		font-weight: 500;
		flex-shrink: 0;
	}

	.bc-command-list {
		flex: 1;
		overflow-y: auto;
		padding: 6px;
	}

	.bc-command-empty {
		padding: 32px 16px;
		text-align: center;
		color: hsl(var(--bc-fg-muted));
		font-size: 13px;
	}

	.bc-command-group {
		padding-bottom: 4px;
	}

	.bc-command-group:not(:last-child) {
		border-bottom: 1px solid hsl(var(--bc-border) / 0.5);
		margin-bottom: 4px;
	}

	.bc-command-group-label {
		padding: 8px 10px 4px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: hsl(var(--bc-fg-muted));
	}

	.bc-command-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		background: transparent;
		color: hsl(var(--bc-fg));
		cursor: pointer;
		text-align: left;
		font-size: 13px;
		transition:
			background 80ms ease,
			color 80ms ease;
	}

	.bc-command-item:hover,
	.bc-command-item-active {
		background: hsl(var(--bc-surface-2));
	}

	.bc-command-item-active {
		color: hsl(var(--bc-accent));
	}

	.bc-command-item-left {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		flex: 1;
	}

	.bc-command-item-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.bc-command-item-label {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bc-command-item-sublabel {
		font-size: 11px;
		color: hsl(var(--bc-fg-muted));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bc-command-item :global(.bc-command-item-enter) {
		color: hsl(var(--bc-fg-muted));
		flex-shrink: 0;
	}

	.bc-command-footer {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 16px;
		border-top: 1px solid hsl(var(--bc-border));
	}

	.bc-command-footer-hint {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: hsl(var(--bc-fg-muted));
	}

	.bc-command-kbd-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 1px 4px;
		min-width: 18px;
		height: 18px;
		border: 1px solid hsl(var(--bc-border));
		background: hsl(var(--bc-bg));
		color: hsl(var(--bc-fg-muted));
		font-size: 10px;
		font-family: var(--font-family-geist);
	}
</style>
