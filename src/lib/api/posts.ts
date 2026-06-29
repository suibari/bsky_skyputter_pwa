import { createAgent } from './agent';
import { getSession } from '$lib/stores/auth.svelte';
import { RichText } from '@atproto/api';
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

export async function getAuthorFeedWithReplies(did: string, cursor?: string) {
	const agent = await createAgent();
	const res = await agent.api.app.bsky.feed.getAuthorFeed({
		actor: did,
		filter: 'posts_with_replies',
		limit: 20,
		cursor
	});
	return res.data;
}

export type PostImageEmbed = {
	blob: BlobRef;
	alt: string;
	aspectRatio?: { width: number; height: number };
};

export type PostVideoEmbed = {
	blob: BlobRef;
	alt: string;
	aspectRatio?: { width: number; height: number };
};

export type PostExternalEmbed = {
	uri: string;
	title: string;
	description: string;
	thumbBlob?: BlobRef;
};

export async function createPost(params: {
	text: string;
	images?: PostImageEmbed[];
	video?: PostVideoEmbed;
	external?: PostExternalEmbed;
	replyTo?: { uri: string; cid: string; rootUri: string; rootCid: string };
	quoteTo?: { uri: string; cid: string };
}) {
	const session = getSession();
	if (!session) throw new Error('Not authenticated');

	const agent = await createAgent();

	const rt = new RichText({ text: params.text });
	await rt.detectFacets(agent);

	const record: AppBskyFeedPost.Record = {
		$type: 'app.bsky.feed.post',
		text: rt.text,
		facets: rt.facets,
		createdAt: new Date().toISOString(),
		langs: ['ja']
	};

	if (params.quoteTo) {
		if (params.images && params.images.length > 0) {
			record.embed = {
				$type: 'app.bsky.embed.recordWithMedia',
				record: { $type: 'app.bsky.embed.record', record: { uri: params.quoteTo.uri, cid: params.quoteTo.cid } },
				media: { $type: 'app.bsky.embed.images', images: params.images.map((img) => ({ image: img.blob, alt: img.alt, ...(img.aspectRatio ? { aspectRatio: img.aspectRatio } : {}) })) }
			};
		} else if (params.video) {
			record.embed = {
				$type: 'app.bsky.embed.recordWithMedia',
				record: { $type: 'app.bsky.embed.record', record: { uri: params.quoteTo.uri, cid: params.quoteTo.cid } },
				media: { $type: 'app.bsky.embed.video', video: params.video.blob, alt: params.video.alt, ...(params.video.aspectRatio ? { aspectRatio: params.video.aspectRatio } : {}) }
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
			images: params.images.map((img) => ({ image: img.blob, alt: img.alt, ...(img.aspectRatio ? { aspectRatio: img.aspectRatio } : {}) }))
		};
	} else if (params.video) {
		record.embed = {
			$type: 'app.bsky.embed.video',
			video: params.video.blob,
			alt: params.video.alt,
			...(params.video.aspectRatio ? { aspectRatio: params.video.aspectRatio } : {})
		};
	} else if (params.external) {
		record.embed = {
			$type: 'app.bsky.embed.external',
			external: {
				uri: params.external.uri,
				title: params.external.title,
				description: params.external.description,
				...(params.external.thumbBlob ? { thumb: params.external.thumbBlob } : {})
			}
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

export async function createLike(uri: string, cid: string) {
	const agent = await createAgent();
	return agent.like(uri, cid);
}

export async function searchPostsByHashtag(tag: string, authorHandle: string, cursor?: string) {
	const agent = await createAgent();
	const res = await agent.api.app.bsky.feed.searchPosts({
		q: `#${tag}`,
		author: authorHandle,
		limit: 20,
		cursor
	});
	return res.data;
}

export async function deletePost(uri: string) {
	const parts = uri.replace('at://', '').split('/');
	const did = parts[0];
	const collection = parts[1];
	const rkey = parts[2];

	const agent = await createAgent();
	return agent.api.com.atproto.repo.deleteRecord({ repo: did, collection, rkey });
}
