import { feature, item, plan } from 'atmn';

// Features
export const sandbox_hours = feature({
	id: 'sandbox_hours',
	name: 'Sandbox Hours',
	type: 'metered',
	consumable: true
});

export const tokens_out = feature({
	id: 'tokens_out',
	name: 'Tokens Out',
	type: 'metered',
	consumable: true
});

export const tokens_in = feature({
	id: 'tokens_in',
	name: 'Tokens In',
	type: 'metered',
	consumable: true
});

export const chat_messages = feature({
	id: 'chat_messages',
	name: 'Chat Messages',
	type: 'metered',
	consumable: true
});

export const ai_budget = feature({
	id: 'ai_budget',
	name: 'AI Budget',
	type: 'metered',
	consumable: true
});

// Plans
export const free_plan = plan({
	id: 'free_plan',
	name: 'Free Plan',
	autoEnable: true,
	items: [
		item({
			featureId: chat_messages.id,
			included: 5,
			reset: {
				interval: 'one_off'
			}
		})
	]
});

export const btca_pro = plan({
	id: 'btca_pro',
	name: 'Pro Plan',
	price: {
		amount: 8,
		interval: 'month'
	},
	items: [
		item({
			featureId: sandbox_hours.id,
			included: 6,
			reset: {
				interval: 'month'
			}
		}),
		item({
			featureId: tokens_in.id,
			included: 1500000,
			reset: {
				interval: 'month'
			}
		}),
		item({
			featureId: tokens_out.id,
			included: 300000,
			reset: {
				interval: 'month'
			}
		})
	]
});
