import { createAgent } from './agent';

export async function listNotifications(cursor?: string) {
	const agent = await createAgent();
	const res = await agent.api.app.bsky.notification.listNotifications({
		limit: 20,
		cursor
	});
	return res.data;
}

export async function getUnreadCount(): Promise<number> {
	const agent = await createAgent();
	const res = await agent.api.app.bsky.notification.getUnreadCount();
	return res.data.count;
}

export async function markSeen(): Promise<void> {
	const agent = await createAgent();
	await agent.api.app.bsky.notification.updateSeen({
		seenAt: new Date().toISOString()
	});
}
