<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import CharCounter from '$lib/components/CharCounter.svelte';
	import ImagePicker from '$lib/components/ImagePicker.svelte';
	import VideoPicker from '$lib/components/VideoPicker.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { getSession, cacheAvatar } from '$lib/stores/auth.svelte';
	import { createAgent } from '$lib/api/agent';
	import { showToast } from '$lib/stores/toast.svelte';
	import type { BlobRef, AppBskyFeedPost } from '@atproto/api';
	import { createPost } from '$lib/api/posts';
	import { uploadImage, uploadVideo } from '$lib/api/media';
	import { getDraft, deleteDraft, saveDraft } from '$lib/db/drafts';

	let text = $state('');
	let images = $state<File[]>([]);
	let video = $state<File | null>(null);
	let posting = $state(false);
	let savingDraft = $state(false);
	let videoUploading = $state(false);
	let draftId = $state<string | null>(null);
	let draftCreatedAt = $state<string | null>(null);
	let myAvatar = $state<string | undefined>(getSession()?.avatar);
	let mediaFileInput: HTMLInputElement;

	type ReplyContext = { uri: string; cid: string; rootUri: string; rootCid: string; text: string; authorHandle: string };
	type QuoteContext = { uri: string; cid: string; text: string; authorHandle: string };

	let replyContext = $state<ReplyContext | null>(null);
	let quoteContext = $state<QuoteContext | null>(null);

	const charCount = $derived(text.length);
	const canPost = $derived(charCount > 0 && charCount <= 300 && !posting);
	const canAddMedia = $derived(images.length < 4 && video === null);

	onMount(async () => {
		const session = getSession();
		if (session && !session.avatar) {
			const agent = await createAgent();
			const profile = await agent.getProfile({ actor: session.did });
			if (profile.data.avatar) {
				myAvatar = profile.data.avatar;
				cacheAvatar(profile.data.avatar);
			}
		}

		const id = $page.url.searchParams.get('draftId');
		if (id) {
			const draft = await getDraft(id);
			if (draft) {
				text = draft.text;
				images = draft.images.map((blob, i) => new File([blob], `draft-image-${i}`, { type: blob.type }));
				draftId = id;
				draftCreatedAt = draft.createdAt;
			}
		}

		const replyTo = $page.url.searchParams.get('replyTo');
		const replyCid = $page.url.searchParams.get('replyCid');
		if (replyTo && replyCid) {
			try {
				const agent = await createAgent();
				const res = await agent.api.app.bsky.feed.getPosts({ uris: [replyTo] });
				const post = res.data.posts[0];
				if (post) {
					const rec = post.record as AppBskyFeedPost.Record;
					const rootUri = rec.reply?.root?.uri ?? replyTo;
					const rootCid = rec.reply?.root?.cid ?? replyCid;
					replyContext = {
						uri: replyTo,
						cid: replyCid,
						rootUri,
						rootCid,
						text: rec.text ?? '',
						authorHandle: post.author.handle
					};
				}
			} catch {
				// フォールバック: テキストなしでコンテキストのみ保持
				replyContext = { uri: replyTo, cid: replyCid, rootUri: replyTo, rootCid: replyCid, text: '', authorHandle: '' };
			}
		}

		const quoteTo = $page.url.searchParams.get('quoteTo');
		const quoteCid = $page.url.searchParams.get('quoteCid');
		if (quoteTo && quoteCid) {
			try {
				const agent = await createAgent();
				const res = await agent.api.app.bsky.feed.getPosts({ uris: [quoteTo] });
				const post = res.data.posts[0];
				if (post) {
					const rec = post.record as AppBskyFeedPost.Record;
					quoteContext = {
						uri: quoteTo,
						cid: quoteCid,
						text: rec.text ?? '',
						authorHandle: post.author.handle
					};
				}
			} catch {
				quoteContext = { uri: quoteTo, cid: quoteCid, text: '', authorHandle: '' };
			}
		}
	});

	async function handlePost() {
		if (!canPost) return;
		posting = true;
		try {
			let uploadedImages: { blob: BlobRef; alt: string }[] = [];
			let uploadedVideo: { blob: BlobRef; alt: string } | undefined;

			if (images.length > 0) {
				const blobs = await Promise.all(images.map((f) => uploadImage(f)));
				uploadedImages = blobs.map((blob) => ({ blob, alt: '' }));
			} else if (video) {
				videoUploading = true;
				const blob = await uploadVideo(video);
				videoUploading = false;
				uploadedVideo = { blob, alt: '' };
			}

			await createPost({
				text,
				images: uploadedImages.length > 0 ? uploadedImages : undefined,
				video: uploadedVideo,
				replyTo: replyContext ?? undefined,
				quoteTo: quoteContext ? { uri: quoteContext.uri, cid: quoteContext.cid } : undefined
			});

			if (draftId) {
				await deleteDraft(draftId);
				draftId = null;
			}

			text = '';
			images = [];
			video = null;
			replyContext = null;
			quoteContext = null;
			showToast('投稿しました', 'success');
		} catch (e) {
			videoUploading = false;
			showToast(e instanceof Error ? e.message : '投稿に失敗しました', 'error');
		} finally {
			posting = false;
		}
	}

	async function handleSaveDraft() {
		savingDraft = true;
		try {
			const now = new Date().toISOString();
			const id = await saveDraft({
				id: draftId ?? '',
				text,
				images: images.map((f) => f as Blob),
				createdAt: draftCreatedAt ?? now,
				updatedAt: now
			});
			draftId = id;
			if (!draftCreatedAt) draftCreatedAt = now;
			showToast('下書きを保存しました', 'success');
		} catch {
			showToast('下書きの保存に失敗しました', 'error');
		} finally {
			savingDraft = false;
		}
	}

	function handleMediaFileChange(e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		let hasConflict = false;

		for (const file of files) {
			if (file.type.startsWith('image/')) {
				if (video !== null) {
					hasConflict = true;
					break;
				}
				if (images.length < 4) {
					images = [...images, file];
				}
			} else if (file.type.startsWith('video/')) {
				if (images.length > 0) {
					hasConflict = true;
					break;
				}
				if (video === null) {
					video = file;
					break;
				}
			}
		}

		if (hasConflict) {
			showToast('動画と画像は同時に添付できません', 'error');
		}

		mediaFileInput.value = '';
	}
</script>

<div class="flex flex-col h-[calc(100dvh-4rem)]">
	<header class="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
		<img src="/skyputter_logo.png" alt="SkyPutter" class="h-7 object-contain" />
		<div class="flex items-center gap-2">
			<button
				onclick={handleSaveDraft}
				disabled={savingDraft || charCount === 0}
				class="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium
					disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{#if savingDraft}
					<LoadingSpinner size={14} />
				{:else}
					下書き
				{/if}
			</button>
			<button
				onclick={handlePost}
				disabled={!canPost}
				class="px-4 py-1.5 rounded-xl bg-[#0085ff] text-white text-sm font-semibold
					disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
			>
				{#if posting}
					<LoadingSpinner size={14} />
				{/if}
				投稿
			</button>
		</div>
	</header>

	<div class="flex-1 flex flex-col px-4 pt-3 gap-3 min-h-0">
		{#if draftId}
			<p class="text-xs text-[#0085ff] bg-blue-50 px-3 py-1.5 rounded-lg shrink-0">下書きを編集中</p>
		{/if}

		<div class="flex gap-3 flex-1 min-h-0">
			<div class="w-10 h-10 rounded-full bg-gray-200 shrink-0 overflow-hidden">
				{#if getSession()?.handle}
					<img
						src={myAvatar}
						alt="アバター"
						class="w-full h-full object-cover"
						onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
					/>
				{/if}
			</div>
			<textarea
				bind:value={text}
				placeholder={replyContext ? '返信する...' : quoteContext ? '引用コメントを入力...' : 'いまなにしてる？'}
				class="flex-1 resize-none text-base text-gray-900 placeholder-gray-400 focus:outline-none leading-relaxed min-h-0"
			></textarea>
		</div>

		{#if images.length > 0}
			<div class="pl-13 shrink-0">
				<ImagePicker bind:images />
			</div>
		{/if}

		{#if video || videoUploading}
			<div class="pl-13 shrink-0">
				{#if videoUploading}
					<div class="flex items-center gap-2 text-sm text-gray-500">
						<LoadingSpinner size={16} />
						<span>動画を処理中...</span>
					</div>
				{:else}
					<VideoPicker bind:video />
				{/if}
			</div>
		{/if}
	</div>

	{#if replyContext}
		<div class="mx-4 mb-1 border-l-2 border-blue-200 pl-3 py-1 bg-blue-50 rounded-r-lg relative shrink-0">
			<button
				onclick={() => (replyContext = null)}
				class="absolute top-1 right-2 text-gray-400 hover:text-gray-600 text-xs"
				aria-label="返信をキャンセル"
			>✕</button>
			<p class="text-xs text-blue-500 font-medium mb-0.5">↩ 返信先 @{replyContext.authorHandle}</p>
			{#if replyContext.text}
				<p class="text-xs text-gray-600 line-clamp-2 pr-4">{replyContext.text}</p>
			{/if}
		</div>
	{/if}

	{#if quoteContext}
		<div class="mx-4 mb-1 border border-amber-200 pl-3 pr-8 py-2 bg-amber-50 rounded-lg relative shrink-0">
			<button
				onclick={() => (quoteContext = null)}
				class="absolute top-1 right-2 text-gray-400 hover:text-gray-600 text-xs"
				aria-label="引用をキャンセル"
			>✕</button>
			<p class="text-xs text-amber-600 font-medium mb-0.5">❝ 引用 @{quoteContext.authorHandle}</p>
			{#if quoteContext.text}
				<p class="text-xs text-gray-600 line-clamp-2">{quoteContext.text}</p>
			{/if}
		</div>
	{/if}

	<div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 shrink-0">
		<div class="flex items-center gap-3">
			<button
				onclick={() => mediaFileInput.click()}
				disabled={!canAddMedia && video !== null}
				class="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#0085ff]
					disabled:opacity-30 disabled:cursor-not-allowed"
				aria-label="メディアを追加"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
				</svg>
			</button>
		</div>
		<CharCounter count={charCount} />
	</div>
</div>

<input
	bind:this={mediaFileInput}
	type="file"
	accept="image/*,video/*"
	multiple
	class="hidden"
	onchange={handleMediaFileChange}
/>
