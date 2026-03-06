# Web Model Picker + AI Budget Plan

## Goal

Add a seamless model picker to the web app for these `opencode` models:

- `minimax-m2.5`
- `claude-haiku-4-5`
- `gpt-5.4`

Users should be able to switch models per project. Billing should use one shared monthly AI budget instead of raw token buckets. The billing UI should show only a percentage bar, not dollar amounts.

## Product Decisions

- Scope model choice to `projects.model`, not user-global state.
- Keep provider fixed to `opencode` for v1.
- Replace `tokens_in`, `tokens_out`, and `sandbox_hours` plan enforcement with one Autumn feature: `ai_budget`.
- Ignore sandbox runtime cost for usage enforcement in v1.
- Prefer a local pricing snapshot sourced from `models.dev`, not live runtime fetches for billing-critical math.
- Billing UI shows a usage bar and percentage only.
- Model picker copy should describe relative usage, not price.

## Pricing Snapshot

Source:

- `https://models.dev/`
- `https://models.dev/api.json`

Snapshot date: `2026-03-05`

### Supported Web Models

| Model | Relative tier | Input / 1M | Output / 1M | Cache read / 1M | Cache write / 1M |
| --- | --- | ---: | ---: | ---: | ---: |
| `minimax-m2.5` | low | `$0.30` | `$1.20` | `$0.06` | n/a |
| `claude-haiku-4-5` | medium | `$1.00` | `$5.00` | `$0.10` | `$1.25` |
| `gpt-5.4` | high | `$2.50` | `$15.00` | `$0.25` | n/a |

## Existing Code Anchors

### Data / project model state

- `apps/web/src/convex/schema.ts`
- `apps/web/src/convex/projects.ts`
- `apps/web/src/lib/stores/project.svelte.ts`

### Sandbox config generation

- `apps/web/src/convex/instances/actions.ts`

### Billing / Autumn

- `apps/web/autumn.config.ts`
- `apps/web/src/convex/usage.ts`
- `apps/web/src/lib/billing/plans.ts`
- `apps/web/src/lib/components/pricing/PricingPlans.svelte`
- `apps/web/src/routes/app/settings/+page.svelte`

### Chat flow / usage finalization

- `apps/web/src/convex/http.ts`
- `apps/server/src/stream/service.ts`

## High-Level Rollout

### Phase 1: Shared model + pricing config

- [ ] Add one web-facing model catalog for the 3 supported models.
- [ ] Add one pricing snapshot module for budget calculations.
- [ ] Keep pricing math internal and stable; do not show raw dollar figures in the UI.

Suggested file:

- `apps/web/src/lib/models/webSandboxModels.ts`

Suggested shape:

```ts
export const WEB_SANDBOX_MODELS = [
	{
		id: 'minimax-m2.5',
		label: 'MiniMax M2.5',
		provider: 'opencode',
		tier: 'low',
		description: 'Lowest usage',
		ratesUsdPerMTokens: {
			input: 0.3,
			output: 1.2,
			cacheRead: 0.06
		}
	},
	{
		id: 'claude-haiku-4-5',
		label: 'Claude Haiku 4.5',
		provider: 'opencode',
		tier: 'medium',
		description: 'Balanced',
		ratesUsdPerMTokens: {
			input: 1,
			output: 5,
			cacheRead: 0.1,
			cacheWrite: 1.25
		}
	},
	{
		id: 'gpt-5.4',
		label: 'GPT-5.4',
		provider: 'opencode',
		tier: 'high',
		description: 'Highest usage',
		ratesUsdPerMTokens: {
			input: 2.5,
			output: 15,
			cacheRead: 0.25
		}
	}
] as const;
```

Notes:

- Use this as the single source for picker options.
- Use the same module for billing math and UX labels.
- For v1, prefer explicit constants over querying `models.dev` at request time.

### Phase 2: AI budget in Autumn

- [ ] Replace Autumn features `tokens_in`, `tokens_out`, and `sandbox_hours` for plan enforcement with a single `ai_budget` feature.
- [ ] Keep `chat_messages` for free plan if desired.
- [ ] Set Pro included usage to a `$5/month` equivalent using integer-safe units.
- [ ] Remove sandbox-hour enforcement from usage checks and UI summaries.

Recommended implementation detail:

- Store budget in integer micros or millicents.
- Do not store floats as the tracked unit.

Suggested approach:

```ts
const USD_MICROS_PER_USD = 1_000_000;
const PRO_AI_BUDGET_USD = 5;
const PRO_AI_BUDGET_MICROS = PRO_AI_BUDGET_USD * USD_MICROS_PER_USD;
```

Suggested Autumn change:

```ts
export const aiBudget = feature({
	id: 'ai_budget',
	name: 'AI Budget',
	type: 'single_use'
});

export const btcaPro = product({
	id: 'btca_pro',
	name: 'Pro Plan',
	items: [
		priceItem({
			price: 8,
			interval: 'month'
		}),
		featureItem({
			feature_id: aiBudget.id,
			included_usage: 5_000_000,
			interval: 'month'
		})
	]
});
```

Files to touch:

- `apps/web/autumn.config.ts`
- `apps/web/src/lib/billing/plans.ts`
- `apps/web/src/convex/usage.ts`

### Phase 3: Budget math + enforcement

- [ ] Add helpers to convert token usage into AI-budget usage units.
- [ ] Use selected project model to estimate budget required before a request starts.
- [ ] Charge actual budget usage after the response finishes.
- [ ] Keep free plan logic separate from Pro budget logic.

Suggested helpers:

```ts
type Rates = {
	input?: number;
	output?: number;
	cacheRead?: number;
	cacheWrite?: number;
};

const toUsdMicros = (usd?: number) =>
	usd == null ? 0 : Math.round(usd * 1_000_000);

const costPartMicros = (tokens: number, usdPerMTokens?: number) =>
	usdPerMTokens == null ? 0 : Math.round((tokens / 1_000_000) * toUsdMicros(usdPerMTokens));

const totalAiBudgetMicros = (args: {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	rates: Rates;
}) =>
	costPartMicros(args.inputTokens ?? 0, args.rates.input) +
	costPartMicros(args.outputTokens ?? 0, args.rates.output) +
	costPartMicros(args.cacheReadTokens ?? 0, args.rates.cacheRead) +
	costPartMicros(args.cacheWriteTokens ?? 0, args.rates.cacheWrite);
```

Files to touch:

- `apps/web/src/convex/usage.ts`

Checklist:

- [ ] Replace `FEATURE_IDS.tokensIn`, `tokensOut`, and `sandboxHours` with `aiBudget`.
- [ ] Replace `ensureUsageAvailable` preflight balance checks with one `requiredBudgetMicros`.
- [ ] Replace `finalizeUsage` tracking calls with one `ai_budget` usage write.
- [ ] Update billing summary return shape to expose one usage metric instead of 3.

### Phase 4: Usage data plumbing

- [ ] Thread the actual selected model into budget finalization.
- [ ] Stop assuming all web traffic uses one hard-coded model.
- [ ] Decide what to do with cache tokens in v1.

Recommended v1:

- Meter `inputTokens` and `outputTokens`.
- Defer `cacheReadTokens` and `cacheWriteTokens` unless those counts are already available reliably in the web request flow.

If cache tokens are available later:

```ts
await ctx.runAction(usageActions.finalizeUsage, {
	instanceId: instance._id,
	modelId,
	questionTokens,
	outputTokens,
	cacheReadTokens,
	cacheWriteTokens
});
```

Current gap to resolve:

- `apps/web/src/convex/http.ts` currently finalizes using question tokens plus char-derived output estimates.
- If possible, prefer actual token counts from the done event or server metadata instead of char heuristics.

### Phase 5: Project-scoped model wiring

- [ ] Use `projects.model` when generating sandbox config.
- [ ] Fall back to `claude-haiku-4-5` when `project.model` is unset.
- [ ] Ensure wake flows use the selected project, not just the instance.
- [ ] Ensure live config sync reloads the server with the selected project's model.

Suggested `generateBtcaConfig` shape:

```ts
function generateBtcaConfig(args: {
	resources: ResourceConfig[];
	model: string;
	provider?: string;
}) {
	return JSON.stringify(
		{
			$schema: 'https://btca.dev/btca.schema.json',
			resources: args.resources,
			model: args.model,
			provider: args.provider ?? 'opencode'
		},
		null,
		2
	);
}
```

Files to touch:

- `apps/web/src/convex/instances/actions.ts`
- `apps/web/src/convex/projects.ts`
- `apps/web/src/lib/stores/project.svelte.ts`

Checklist:

- [ ] Load project model in wake flow when `projectId` is present.
- [ ] Load project model in resource sync flow.
- [ ] Update `wakeMyInstance` or add a new project-aware wake action for chat.
- [ ] Keep current behavior for projects with no model set.

### Phase 6: Picker UX

- [ ] Add a compact picker near the active project/chat context.
- [ ] Add a secondary surface in project settings.
- [ ] Disable switching while a response is streaming.
- [ ] Save immediately and apply immediately when runtime is already running.
- [ ] For stopped sandboxes, save now and show that it applies on wake.

Recommended copy:

- `MiniMax M2.5` - `Lowest usage`
- `Claude Haiku 4.5` - `Balanced`
- `GPT-5.4` - `Highest usage`

Helper text:

- `Model choice affects how quickly your monthly usage bar fills.`

Suggested Svelte sketch:

```svelte
<Dropdown
	value={selectedModel}
	options={WEB_SANDBOX_MODELS.map((model) => ({
		value: model.id,
		label: `${model.label} - ${model.description}`
	}))}
	disabled={isStreaming || isSaving}
/>
```

Files to touch:

- `apps/web/src/routes/app/chat/[id]/+page.svelte`
- `apps/web/src/lib/components/ProjectSelector.svelte`
- `apps/web/src/lib/components/CreateProjectModal.svelte`
- `apps/web/src/routes/app/settings/resources/+page.svelte`

UX details:

- Do not force model selection during project creation for v1.
- Default new projects to Haiku or leave unset and inherit default.
- Show a toast after save:
  - running: `Switched this project to GPT-5.4`
  - stopped: `Saved. This applies next time the project wakes.`

### Phase 7: Billing UI refresh

- [ ] Remove token bucket presentation from billing surfaces.
- [ ] Replace with one AI-usage percentage bar.
- [ ] Do not show dollar figures.
- [ ] Remove sandbox-usage meter if it is no longer enforced.

Suggested display shape:

```ts
type BillingSummary = {
	usage: {
		aiBudget: {
			usedPct: number;
			remainingPct: number;
			isDepleted: boolean;
		};
	};
};
```

Suggested UI copy:

- heading: `Monthly AI usage`
- label: `42% used`
- helper: `Higher-end models use this faster.`

Files to touch:

- `apps/web/src/convex/usage.ts`
- `apps/web/src/lib/billing/plans.ts`
- `apps/web/src/lib/components/pricing/PricingPlans.svelte`
- `apps/web/src/routes/app/settings/+page.svelte`

### Phase 8: Pricing / marketing copy

- [ ] Remove copy that implies the web app uses only Haiku.
- [ ] Update plan copy to mention the 3-model selector.
- [ ] Keep messaging qualitative, not numeric.

Suggested copy direction:

- `Choose between low, balanced, and high-end models`
- `Monthly AI usage is shared across all models`

### Phase 9: Analytics

- [ ] Track model changes.
- [ ] Track which model was used for completed streams.
- [ ] Track budget depletion events.

Suggested events:

- `project_model_updated`
- `stream_completed` with `modelId`
- `usage_limit_reached` with `feature: ai_budget`

### Phase 10: Testing checklist

- [ ] New project with no model set uses fallback model.
- [ ] Changing model on stopped project persists and applies on wake.
- [ ] Changing model on running project reloads config and keeps chat working.
- [ ] Preflight blocks requests when AI budget is depleted.
- [ ] Billing summary shows one percentage bar only.
- [ ] Free plan still uses message count limits.
- [ ] Chat wake path respects selected project model.
- [ ] Selected model survives page reload and project switching.

## Recommended Execution Order

1. Create shared model catalog + pricing snapshot.
2. Convert Autumn product to `ai_budget`.
3. Refactor `usage.ts` to one-budget enforcement.
4. Refactor billing summary + billing UI to one percentage bar.
5. Wire `projects.model` into sandbox config generation and reload.
6. Add project-aware wake path.
7. Add picker UI and toast states.
8. Update copy and analytics.

## Open Questions

- Do we meter cache reads in v1 if usage counts are available, or defer them?
- Should the default project explicitly store `claude-haiku-4-5`, or keep fallback logic only?
- Should free plan use a fixed model, or can free users also pick among the 3 models?

## Success Criteria

- Users can switch between `minimax-m2.5`, `claude-haiku-4-5`, and `gpt-5.4` per project.
- Billing enforces one AI budget instead of raw token buckets.
- Billing UI shows only percentage-based usage.
- No sandbox-hour enforcement remains in the customer-facing usage path.
- Existing projects without a saved model continue to work.
