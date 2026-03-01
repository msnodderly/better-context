<script lang="ts">
	import {
		BookOpen,
		CreditCard,
		LifeBuoy,
		Link,
		Loader2,
		MessageSquare,
		Moon,
		Plus,
		Search,
		Settings,
		Sun
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import { getThemeStore } from '$lib/stores/theme.svelte';

	type ThreadItem = {
		_id: string;
		title?: string | null;
		lastActivityAt: number;
		isStreaming?: boolean;
	};

	interface Props {
		isOpen: boolean;
		threads: ThreadItem[];
		currentThreadId: string | null;
	}

	type ActionItemId = 'new-thread' | 'quick-add-resource' | 'toggle-theme';
	type ShortcutItemId =
		| 'shortcut-mcp'
		| 'shortcut-resources'
		| 'shortcut-settings'
		| 'shortcut-billing'
		| 'shortcut-support';

	type ActionItem = {
		id: ActionItemId;
		kind: 'action';
		label: string;
		description: string;
		keywords: string;
	};

	type ShortcutItem = {
		id: ShortcutItemId;
		kind: 'shortcut';
		label: string;
		description: string;
		keywords: string;
		href: string;
	};

	type ThreadCommandItem = {
		id: string;
		kind: 'thread';
		label: string;
		description: string;
		keywords: string;
		href: string;
		isActive: boolean;
		isStreaming: boolean;
	};

	type CommandItem = ActionItem | ShortcutItem | ThreadCommandItem;

	const shortcutItems: ShortcutItem[] = [
		{
			id: 'shortcut-mcp',
			kind: 'shortcut',
			label: 'MCP Questions',
			description: 'Open MCP prompts and question settings',
			keywords: 'mcp questions prompts',
			href: '/app/settings/questions'
		},
		{
			id: 'shortcut-resources',
			kind: 'shortcut',
			label: 'Resources',
			description: 'Manage project resources and docs',
			keywords: 'resources docs',
			href: '/app/settings/resources'
		},
		{
			id: 'shortcut-settings',
			kind: 'shortcut',
			label: 'Settings',
			description: 'Open workspace settings',
			keywords: 'settings preferences',
			href: '/app/settings'
		},
		{
			id: 'shortcut-billing',
			kind: 'shortcut',
			label: 'Billing',
			description: 'Manage plan and subscription',
			keywords: 'billing plan subscription',
			href: '/app/settings/billing'
		},
		{
			id: 'shortcut-support',
			kind: 'shortcut',
			label: 'Support',
			description: 'Open support and help page',
			keywords: 'support help',
			href: '/app/support'
		}
	];

	let { isOpen, threads, currentThreadId }: Props = $props();

	const dispatch = createEventDispatcher<{ close: void; quickAddResource: void }>();
	const themeStore = getThemeStore();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	const queryTerms = $derived.by(() =>
		query
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter(Boolean)
	);

	const actionItems = $derived.by(
		(): ActionItem[] => [
			{
				id: 'new-thread',
				kind: 'action',
				label: 'New Thread',
				description: 'Create and open a new conversation',
				keywords: 'new thread create chat'
			},
			{
				id: 'quick-add-resource',
				kind: 'action',
				label: 'Quick Add Resource',
				description: 'Paste a git repo URL and add it',
				keywords: 'quick add resource git repo'
			},
			{
				id: 'toggle-theme',
				kind: 'action',
				label: themeStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
				description: 'Toggle app theme',
				keywords: 'theme dark light mode'
			}
		]
	);

	const matchesTerms = (haystack: string, terms: string[]) =>
		terms.every((term) => haystack.includes(term));

	const matchesQuery = (label: string, description: string, keywords: string, terms: string[]) =>
		matchesTerms(`${label} ${description} ${keywords}`.toLowerCase(), terms);

	const filteredActions = $derived.by(() => {
		const terms = queryTerms;
		return actionItems.filter((item) =>
			matchesQuery(item.label, item.description, item.keywords, terms)
		);
	});

	const filteredShortcuts = $derived.by(() => {
		const terms = queryTerms;
		return shortcutItems.filter((item) =>
			matchesQuery(item.label, item.description, item.keywords, terms)
		);
	});

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const filteredThreads = $derived.by(() => {
		const terms = queryTerms;
		return [...threads]
			.sort((a, b) => b.lastActivityAt - a.lastActivityAt)
			.filter((thread) => {
				const label = thread.title ?? `Thread ${thread._id.slice(0, 8)}...`;
				return matchesTerms(`${label} ${thread._id}`.toLowerCase(), terms);
			})
			.slice(0, 12)
			.map((thread): ThreadCommandItem => ({
				id: `thread-${thread._id}`,
				kind: 'thread',
				label: thread.title ?? `Thread ${thread._id.slice(0, 8)}...`,
				description: formatDate(thread.lastActivityAt),
				keywords: thread._id.toLowerCase(),
				href: `/app/chat/${thread._id}`,
				isActive: currentThreadId === thread._id,
				isStreaming: !!thread.isStreaming
			}));
	});

	const quickItems = $derived.by(() => [...filteredActions, ...filteredShortcuts]);
	const allItems = $derived.by(() => [...quickItems, ...filteredThreads]);

	const commandItemClass = (selected: boolean) =>
		`flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors ${
			selected
				? 'border-[hsl(var(--bc-accent))] bg-[hsl(var(--bc-surface-2))]'
				: 'border-transparent hover:border-[hsl(var(--bc-border))] hover:bg-[hsl(var(--bc-surface-2))]'
		}`;

	function closeCommandBar() {
		dispatch('close');
	}

	function moveSelection(direction: 1 | -1) {
		if (allItems.length === 0) return;
		selectedIndex = (selectedIndex + direction + allItems.length) % allItems.length;
	}

	function runItem(item: CommandItem) {
		if (item.kind === 'thread' || item.kind === 'shortcut') {
			void goto(item.href);
			closeCommandBar();
			return;
		}

		if (item.id === 'new-thread') {
			void goto('/app/chat/new');
			closeCommandBar();
			return;
		}

		if (item.id === 'quick-add-resource') {
			closeCommandBar();
			dispatch('quickAddResource');
			return;
		}

		themeStore.toggle();
		closeCommandBar();
	}

	function runSelectedItem() {
		const selected = allItems[selectedIndex];
		if (selected) runItem(selected);
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!isOpen) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			closeCommandBar();
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveSelection(1);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveSelection(-1);
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			runSelectedItem();
		}
	}

	$effect(() => {
		if (!isOpen) {
			query = '';
			selectedIndex = 0;
			return;
		}
		queueMicrotask(() => inputEl?.focus());
	});

	$effect(() => {
		query;
		selectedIndex = 0;
	});

	$effect(() => {
		const total = allItems.length;
		if (total === 0) {
			selectedIndex = 0;
			return;
		}
		if (selectedIndex >= total) {
			selectedIndex = 0;
		}
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-[70] flex items-start justify-center bg-[hsl(var(--bc-bg))]/80 px-4 pt-16 backdrop-blur-sm"
		onclick={closeCommandBar}
		role="presentation"
	>
		<div
			class="bc-card w-full max-w-2xl overflow-hidden shadow-[0_16px_40px_hsl(var(--bc-shadow)/0.24)]"
			role="dialog"
			aria-modal="true"
			aria-label="Command bar"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<div class="flex items-center gap-3 border-b border-[hsl(var(--bc-border))] px-4 py-3">
				<Search size={16} class="bc-muted shrink-0" />
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--bc-fg-muted))]"
					placeholder="Search threads or run a command..."
				/>
				<span
					class="bc-muted border border-[hsl(var(--bc-border))] bg-[hsl(var(--bc-surface-2))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
				>
					Esc
				</span>
			</div>

			<div class="max-h-[60vh] overflow-y-auto p-2">
				{#if allItems.length === 0}
					<div class="px-3 py-6 text-center">
						<div class="text-sm font-semibold">No matches found</div>
						<p class="bc-muted mt-1 text-xs">Try a different command or search term.</p>
					</div>
				{:else}
					{#if quickItems.length > 0}
						<div class="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider opacity-60">
							Actions
						</div>
						<div class="flex flex-col gap-1">
							{#each quickItems as item, index (item.id)}
								<button
									type="button"
									class={commandItemClass(selectedIndex === index)}
									onmouseenter={() => (selectedIndex = index)}
									onclick={() => runItem(item)}
								>
									<div class="bc-muted shrink-0">
										{#if item.kind === 'action' && item.id === 'new-thread'}
											<Plus size={15} />
										{:else if item.kind === 'action' && item.id === 'quick-add-resource'}
											<Link size={15} />
										{:else if item.kind === 'action' && item.id === 'toggle-theme'}
											{#if themeStore.theme === 'dark'}
												<Sun size={15} />
											{:else}
												<Moon size={15} />
											{/if}
										{:else if item.kind === 'shortcut' && item.id === 'shortcut-mcp'}
											<MessageSquare size={15} />
										{:else if item.kind === 'shortcut' && item.id === 'shortcut-resources'}
											<BookOpen size={15} />
										{:else if item.kind === 'shortcut' && item.id === 'shortcut-settings'}
											<Settings size={15} />
										{:else if item.kind === 'shortcut' && item.id === 'shortcut-billing'}
											<CreditCard size={15} />
										{:else if item.kind === 'shortcut' && item.id === 'shortcut-support'}
											<LifeBuoy size={15} />
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<div class="truncate text-sm font-medium">{item.label}</div>
										<div class="bc-muted truncate text-xs">{item.description}</div>
									</div>
								</button>
							{/each}
						</div>
					{/if}

					{#if filteredThreads.length > 0}
						<div class="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider opacity-60">
							Threads
						</div>
						<div class="flex flex-col gap-1">
							{#each filteredThreads as item, threadIndex (item.id)}
								{@const globalIndex = quickItems.length + threadIndex}
								<button
									type="button"
									class={commandItemClass(selectedIndex === globalIndex)}
									onmouseenter={() => (selectedIndex = globalIndex)}
									onclick={() => runItem(item)}
								>
									<div class="bc-muted shrink-0">
										<MessageSquare size={15} />
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2 truncate text-sm font-medium">
											<span class="truncate">{item.label}</span>
											{#if item.isStreaming}
												<Loader2
													size={12}
													class="shrink-0 animate-spin text-[hsl(var(--bc-accent))]"
												/>
											{/if}
										</div>
										<div class="bc-muted truncate text-xs">{item.description}</div>
									</div>
									{#if item.isActive}
										<span
											class="border border-[hsl(var(--bc-accent))] bg-[hsl(var(--bc-accent)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--bc-accent))]"
										>
											Current
										</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
