import { PUBLIC_API_URL } from '$env/static/public';
import { createAgent } from './agent';

// 「リポストの次のポスト」イベント（サーバー独自の合成通知）
export type RepostNextPostEvent = {
	uri: string;
	cid: string;
	reposterDid: string;
	createdAt: string;
};

// 表示対象の「リポストの次のポスト」イベントを取得する（同じリポスト主ごとに最新1件）
export async function getRepostNextPostEvents(accessJwt: string): Promise<RepostNextPostEvent[]> {
	const res = await fetch(`${PUBLIC_API_URL}/api/notifications/repost-next-post`, {
		headers: { Authorization: `Bearer ${accessJwt}` }
	});
	if (!res.ok) throw new Error('Failed to fetch repost-next-post events');
	const data = (await res.json()) as { events: RepostNextPostEvent[] };
	return data.events;
}

// 「リポストの次のポスト」機能の現在のON/OFFを取得する
export async function getRepostNextPostEnabled(accessJwt: string): Promise<boolean> {
	const res = await fetch(`${PUBLIC_API_URL}/api/notifications/repost-next-post/settings`, {
		headers: { Authorization: `Bearer ${accessJwt}` }
	});
	if (!res.ok) throw new Error('Failed to get repost-next-post setting');
	const data = (await res.json()) as { enabled: boolean };
	return data.enabled;
}

// 「リポストの次のポスト」機能のON/OFFを切り替える
export async function setRepostNextPostEnabled(accessJwt: string, enabled: boolean): Promise<void> {
	const res = await fetch(`${PUBLIC_API_URL}/api/notifications/repost-next-post/settings`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessJwt}`
		},
		body: JSON.stringify({ enabled })
	});
	if (!res.ok) throw new Error('Failed to update repost-next-post setting');
}

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
