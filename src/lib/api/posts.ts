import { createAgent } from './agent';
import { getSession } from '$lib/stores/auth.svelte';
import type { BlobRef, AppBskyFeedPost } from '@atproto/api';

export async function getAuthorFeed(did: string, cursor?: string) {
	const agent = await createAgent();
	const res = await agent.api.app.bsky.feed.getAuthorFeed({
		actor: did,
		filter: 'posts_no_replies',
		limit: 20,
		cursor
	});
	return res.data;
}

export type PostImageEmbed = {
	blob: BlobRef;
	alt: string;
};

export type PostVideoEmbed = {
	blob: BlobRef;
	alt: string;
};

export async function createPost(params: {
	text: string;
	images?: PostImageEmbed[];
	video?: PostVideoEmbed;
	replyTo?: { uri: string; cid: string; rootUri: string; rootCid: string };
	quoteTo?: { uri: string; cid: string };
}) {
	const session = getSession();
	if (!session) throw new Error('Not authenticated');

	const agent = await createAgent();

	const record: AppBskyFeedPost.Record = {
		$type: 'app.bsky.feed.post',
		text: params.text,
		createdAt: new Date().toISOString(),
		langs: ['ja']
	};

	if (params.quoteTo) {
		if (params.images && params.images.length > 0) {
			record.embed = {
				$type: 'app.bsky.embed.recordWithMedia',
				record: { $type: 'app.bsky.embed.record', record: { uri: params.quoteTo.uri, cid: params.quoteTo.cid } },
				media: { $type: 'app.bsky.embed.images', images: params.images.map((img) => ({ image: img.blob, alt: img.alt })) }
			};
		} else if (params.video) {
			record.embed = {
				$type: 'app.bsky.embed.recordWithMedia',
				record: { $type: 'app.bsky.embed.record', record: { uri: params.quoteTo.uri, cid: params.quoteTo.cid } },
				media: { $type: 'app.bsky.embed.video', video: params.video.blob, alt: params.video.alt }
			};
		} else {
			record.embed = {
				$type: 'app.bsky.embed.record',
				record: { uri: params.quoteTo.uri, cid: params.quoteTo.cid }
			};
		}
	} else if (params.images && params.images.length > 0) {
		record.embed = {
			$type: 'app.bsky.embed.images',
			images: params.images.map((img) => ({ image: img.blob, alt: img.alt }))
		};
	} else if (params.video) {
		record.embed = {
			$type: 'app.bsky.embed.video',
			video: params.video.blob,
			alt: params.video.alt
		};
	}

	if (params.replyTo) {
		record.reply = {
			root: { uri: params.replyTo.rootUri, cid: params.replyTo.rootCid },
			parent: { uri: params.replyTo.uri, cid: params.replyTo.cid }
		};
	}

	return agent.api.com.atproto.repo.createRecord({
		repo: session.did,
		collection: 'app.bsky.feed.post',
		record
	});
}

export async function deletePost(uri: string) {
	const parts = uri.replace('at://', '').split('/');
	const did = parts[0];
	const collection = parts[1];
	const rkey = parts[2];

	const agent = await createAgent();
	return agent.api.com.atproto.repo.deleteRecord({ repo: did, collection, rkey });
}
