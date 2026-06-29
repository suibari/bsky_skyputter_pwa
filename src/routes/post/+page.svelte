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
	import type { BlobRef, AppBskyFeedPost, AppBskyActorDefs } from '@atproto/api';
	import { createPost, type PostExternalEmbed } from '$lib/api/posts';
	import MentionSuggestions from '$lib/components/MentionSuggestions.svelte';
	import { avatarThumbnail } from '$lib/image';
	import { uploadImage, uploadVideo, getImageDimensions, getVideoDimensions } from '$lib/api/media';
	import { getDraft, deleteDraft, saveDraft } from '$lib/db/drafts';
	import { fetchOgp, type OgpData } from '$lib/api/ogp';
	import LinkCardPreview from '$lib/components/LinkCardPreview.svelte';
	import { getComposeText, setComposeText, clearComposeText, loadComposeText } from '$lib/stores/compose.svelte';
	import EmojiPicker from '$lib/components/EmojiPicker.svelte';
	import { recordEmojiUse } from '$lib/stores/emoji-frequency.svelte';
	import { getT } from '$lib/stores/language.svelte';

	const t = $derived(getT());

	let text = $state(getComposeText());
	let images = $state<File[]>([]);
	let video = $state<File | null>(null);
	let posting = $state(false);
	let savingDraft = $state(false);
	let videoUploading = $state(false);
	let videoProgress = $state<number | null>(null);
	let draftId = $state<string | null>(null);
	let draftCreatedAt = $state<string | null>(null);
	let myAvatar = $state<string | undefined>(getSession()?.avatar);
	let mediaFileInput: HTMLInputElement;

	type ReplyContext = { uri: string; cid: string; rootUri: string; rootCid: string; text: string; authorHandle: string };
	type QuoteContext = { uri: string; cid: string; text: string; authorHandle: string };

	let replyContext = $state<ReplyContext | null>(null);
	let quoteContext = $state<QuoteContext | null>(null);

	let ogpData = $state<OgpData | null>(null);
	let ogpLoading = $state(false);
	let ogpDismissed = $state(false);
	let ogpCurrentUrl: string | null = null; // $state にすると effect の依存に入りタイマーがキャンセルされるため通常変数
	let ogpDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let ogpLocked = false; // trueの時はカード確定済み、URL変更を無視（×ボタンでのみ解除）

	let highlightDiv = $state<HTMLDivElement | undefined>(undefined);
	let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);
	let showEmojiPicker = $state(false);
	let cursorPos = $state(0);

	let mentionQuery = $state<string | null>(null);
	let mentionStart = $state(0);
	let mentionActors = $state<AppBskyActorDefs.ProfileViewBasic[]>([]);
	let mentionLoading = $state(false);
	let mentionFocusIdx = $state(-1);
	let mentionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let vpOffsetBottom = $state(0);
	let toolbarHeight = $state(56);

	$effect(() => {
		if (typeof window === 'undefined' || !window.visualViewport) return;
		const vv = window.visualViewport;
		const update = () => {
			vpOffsetBottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
		};
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		update();
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
		};
	});

	function handleEmojiSelect(emoji: string) {
		const pos = cursorPos;
		text = text.slice(0, pos) + emoji + text.slice(pos);
		const newPos = pos + [...emoji].length;
		cursorPos = newPos;
		showEmojiPicker = false;
		recordEmojiUse(emoji);
		requestAnimationFrame(() => {
			textareaEl?.focus();
			textareaEl?.setSelectionRange(newPos, newPos);
		});
	}

	function resetMention() {
		mentionQuery = null;
		mentionActors = [];
		mentionFocusIdx = -1;
		mentionLoading = false;
		if (mentionDebounceTimer) { clearTimeout(mentionDebounceTimer); mentionDebounceTimer = null; }
	}

	function detectMention(value: string, pos: number): { query: string; start: number } | null {
		const before = value.slice(0, pos);
		const match = before.match(/(^|[\s\n])@([a-zA-Z0-9._-]*)$/);
		if (!match) return null;
		return { query: match[2], start: before.lastIndexOf('@') };
	}

	function handleInput() {
		syncScroll();
		const pos = textareaEl?.selectionStart ?? 0;
		cursorPos = pos;
		const detected = detectMention(text, pos);

		if (!detected) { resetMention(); return; }
		if (detected.query === mentionQuery && detected.start === mentionStart) return;

		mentionStart = detected.start;
		mentionQuery = detected.query;
		mentionFocusIdx = -1;

		if (mentionDebounceTimer) clearTimeout(mentionDebounceTimer);

		if (!detected.query.length) {
			mentionActors = [];
			mentionLoading = false;
			return;
		}

		mentionLoading = true;
		mentionDebounceTimer = setTimeout(async () => {
			const q = detected.query;
			try {
				const agent = await createAgent();
				const res = await agent.api.app.bsky.actor.searchActorsTypeahead({ q, limit: 8 });
				if (mentionQuery === q) { mentionActors = res.data.actors; mentionLoading = false; }
			} catch {
				if (mentionQuery === q) { mentionActors = []; mentionLoading = false; }
			}
		}, 300);
	}

	function handleMentionSelect(actor: AppBskyActorDefs.ProfileViewBasic) {
		if (mentionQuery === null) return;
		const insertion = `@${actor.handle} `;
		text = text.slice(0, mentionStart) + insertion + text.slice(mentionStart + 1 + mentionQuery.length);
		const newPos = mentionStart + insertion.length;
		resetMention();
		requestAnimationFrame(() => {
			textareaEl?.focus();
			textareaEl?.setSelectionRange(newPos, newPos);
			cursorPos = newPos;
			syncScroll();
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey && e.key === 'Enter' && canPost) { handlePost(); return; }
		if (mentionActors.length > 0 || mentionLoading) {
			if (e.key === 'ArrowDown') { e.preventDefault(); mentionFocusIdx = Math.min(mentionFocusIdx + 1, mentionActors.length - 1); return; }
			if (e.key === 'ArrowUp') { e.preventDefault(); mentionFocusIdx = Math.max(mentionFocusIdx - 1, -1); return; }
			if ((e.key === 'Enter' || e.key === 'Tab') && mentionFocusIdx >= 0) { e.preventDefault(); handleMentionSelect(mentionActors[mentionFocusIdx]); return; }
			if (e.key === 'Escape') { e.preventDefault(); resetMention(); return; }
		}
	}

	const showMentionSuggestions = $derived(
		mentionQuery !== null && mentionQuery.length > 0 && (mentionLoading || mentionActors.length > 0)
	);

	$effect(() => {
		if (!showMentionSuggestions) return;
		function handleOutside(e: PointerEvent) {
			if (!(e.target as Element).closest('[data-mention-suggestions]') && e.target !== textareaEl) {
				resetMention();
			}
		}
		window.addEventListener('pointerdown', handleOutside, true);
		return () => window.removeEventListener('pointerdown', handleOutside, true);
	});

	function syncScroll() {
		if (highlightDiv && textareaEl) {
			highlightDiv.scrollTop = textareaEl.scrollTop;
		}
	}

	const FACET_REGEX = /(https?:\/\/[^\s]+|#[\p{L}\p{N}_]+|@[a-zA-Z0-9._-]+)/gu;

	function computeHighlight(t: string): string {
		const parts = t.split(FACET_REGEX);
		return parts.map((part, i) => {
			const esc = part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			return i % 2 === 1 ? `<span class="text-[#0085ff]">${esc}</span>` : esc;
		}).join('');
	}

	const highlightedText = $derived(computeHighlight(text) + (text.endsWith('\n') ? ' ' : ''));

	$effect(() => {
		if (!draftId) setComposeText(text);
	});

	const URL_REGEX = /https?:\/\/[^\s]+/g;

	$effect(() => {
		const urls = text.match(URL_REGEX);
		const firstUrl = urls?.[0] ?? null;

		if (ogpDebounceTimer) clearTimeout(ogpDebounceTimer);

		// URLがなくなってもカードは維持する（×ボタンでのみ消去）
		if (!firstUrl) return;

		// カード確定済みはURL変更を無視（×ボタンでのみ解除）
		if (ogpLocked) return;

		if (firstUrl === ogpCurrentUrl) return;

		// New URL detected — reset dismissed flag and start debounce
		ogpDismissed = false;
		ogpData = null;
		ogpCurrentUrl = firstUrl;
		ogpLoading = true;

		ogpDebounceTimer = setTimeout(async () => {
			const result = await fetchOgp(firstUrl);
			// Only apply if the URL hasn't changed while waiting
			if (ogpCurrentUrl === firstUrl) {
				ogpData = result;
				ogpLoading = false;
				if (result !== null) ogpLocked = true;
			}
		}, 800);
	});

	const charCount = $derived(text.length);
	const canPost = $derived(
		(charCount > 0 || images.length > 0 || video !== null) &&
		charCount <= 300 &&
		!posting
	);
	const canAddMedia = $derived(images.length < 10 && video === null);

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
		} else {
			loadComposeText();
			text = getComposeText();
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
				const [blobs, dims] = await Promise.all([
					Promise.all(images.map(uploadImage)),
					Promise.all(images.map(getImageDimensions))
				]);
				uploadedImages = blobs.map((blob, i) => ({ blob, alt: '', aspectRatio: dims[i] }));
			} else if (video) {
				videoUploading = true;
				const [blob, dims] = await Promise.all([
					uploadVideo(video, (p) => { videoProgress = p; }),
					getVideoDimensions(video)
				]);
				videoUploading = false;
				videoProgress = null;
				uploadedVideo = { blob, alt: '', aspectRatio: dims };
			}

			let external: PostExternalEmbed | undefined;
			if (ogpData && !ogpDismissed && uploadedImages.length === 0 && !uploadedVideo) {
				external = { uri: ogpData.uri, title: ogpData.title, description: ogpData.description };
				if (ogpData.thumb) {
					try {
						const agent = await createAgent();
						const thumbRes = await fetch(ogpData.thumb);
						const thumbBlob = await thumbRes.blob();
						const uploaded = await agent.uploadBlob(thumbBlob, { encoding: thumbBlob.type });
						external.thumbBlob = uploaded.data.blob;
					} catch {
						// サムネイルアップロード失敗は無視して続行
					}
				}
			}

			await createPost({
				text,
				images: uploadedImages.length > 0 ? uploadedImages : undefined,
				video: uploadedVideo,
				external,
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
			ogpData = null;
			ogpLoading = false;
			ogpDismissed = false;
			ogpCurrentUrl = null;
			ogpLocked = false;
			resetMention();
			clearComposeText();
			showToast(t.post.toast.posted, 'success');
		} catch (e) {
			videoUploading = false;
			videoProgress = null;
			showToast(e instanceof Error ? e.message : t.post.toast.postFailed, 'error');
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
			clearComposeText();
			showToast(t.post.toast.draftSaved, 'success');
		} catch {
			showToast(t.post.toast.draftSaveFailed, 'error');
		} finally {
			savingDraft = false;
		}
	}

	function addMediaFiles(files: File[]) {
		let hasConflict = false;

		for (const file of files) {
			if (file.type.startsWith('image/')) {
				if (video !== null) {
					hasConflict = true;
					break;
				}
				if (images.length < 10) {
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
			showToast(t.post.toast.mediaConflict, 'error');
		}
	}

	function handleMediaFileChange(e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		addMediaFiles(files);
		mediaFileInput.value = '';
	}

	function handlePaste(e: ClipboardEvent) {
		const files = Array.from(e.clipboardData?.items ?? [])
			.filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
			.map((it) => it.getAsFile())
			.filter((f): f is File => f !== null);
		if (files.length === 0) return;
		e.preventDefault();
		addMediaFiles(files);
	}
</script>

<div class="flex flex-col h-[calc(100dvh-4rem)]">
	<header class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
		<img src="/skyputter_logo.png" alt="SkyPutter" class="h-7 object-contain" />
		<div class="flex items-center gap-2">
			<button
				onclick={handleSaveDraft}
				disabled={savingDraft || charCount === 0}
				class="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 font-medium
					disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{#if savingDraft}
					<LoadingSpinner size={14} />
				{:else}
					{t.post.draft}
				{/if}
			</button>
			<button
				onclick={handlePost}
				disabled={!canPost}
				class="px-4 py-1.5 rounded-xl bg-[#0085ff] text-white text-sm font-semibold
					disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
			>
				{#if posting}
					<LoadingSpinner size={14} class="text-white" />
				{/if}
				{t.post.post}
			</button>
		</div>
	</header>

	<div class="flex-1 flex flex-col px-4 pt-3 gap-3 min-h-0">
		{#if draftId}
			<p class="text-xs text-[#0085ff] bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg shrink-0">{t.post.editingDraft}</p>
		{/if}

		<div class="flex gap-3 flex-1 min-h-0">
			<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 overflow-hidden">
				{#if getSession()?.handle}
					<img
						src={avatarThumbnail(myAvatar)}
						alt={t.post.ariaAvatar}
						class="w-full h-full object-cover"
						onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
					/>
				{/if}
			</div>
			<div class="flex-1 min-h-0 relative">
				<div
					bind:this={highlightDiv}
					class="absolute inset-0 text-base leading-relaxed whitespace-pre-wrap wrap-break-word overflow-x-hidden overflow-y-auto scrollbar-gutter-stable scrollbar-none pointer-events-none text-gray-900 dark:text-gray-100"
					aria-hidden="true"
				>{@html highlightedText}</div>
				<textarea
					bind:value={text}
					bind:this={textareaEl}
					onscroll={syncScroll}
					placeholder={replyContext ? t.post.replyPlaceholder : quoteContext ? t.post.quotePlaceholder : t.post.placeholder}
					class="absolute inset-0 w-full h-full resize-none text-base text-transparent caret-gray-900 dark:caret-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none leading-relaxed bg-transparent p-0 scrollbar-gutter-stable scrollbar-none wrap-break-word overflow-x-hidden"
					oninput={handleInput}
					onblur={() => { cursorPos = textareaEl?.selectionStart ?? cursorPos; }}
					onkeydown={handleKeydown}
					onpaste={handlePaste}
				></textarea>
			</div>
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
						<span>{t.post.processingVideo(videoProgress)}</span>
					</div>
				{:else}
					<VideoPicker bind:video />
				{/if}
			</div>
		{/if}
	</div>

	{#if replyContext}
		<div class="mx-4 mb-1 border-l-2 border-blue-200 dark:border-blue-800 pl-3 py-1 bg-blue-50 dark:bg-blue-950 rounded-r-lg relative shrink-0">
			<button
				onclick={() => (replyContext = null)}
				class="absolute top-1 right-2 text-gray-400 hover:text-gray-600 text-xs"
				aria-label={t.post.cancelReply}
			>✕</button>
			<p class="text-xs text-blue-500 font-medium mb-0.5">{t.post.replyLabel(replyContext.authorHandle)}</p>
			{#if replyContext.text}
				<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 pr-4">{replyContext.text}</p>
			{/if}
		</div>
	{/if}

	{#if quoteContext}
		<div class="mx-4 mb-1 border border-amber-200 dark:border-amber-800 pl-3 pr-8 py-2 bg-amber-50 dark:bg-amber-950 rounded-lg relative shrink-0">
			<button
				onclick={() => (quoteContext = null)}
				class="absolute top-1 right-2 text-gray-400 hover:text-gray-600 text-xs"
				aria-label={t.post.cancelQuote}
			>✕</button>
			<p class="text-xs text-amber-600 font-medium mb-0.5">{t.post.quoteLabel(quoteContext.authorHandle)}</p>
			{#if quoteContext.text}
				<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{quoteContext.text}</p>
			{/if}
		</div>
	{/if}

	{#if (ogpLoading || ogpData) && !ogpDismissed && images.length === 0 && !video}
		<LinkCardPreview
			ogp={ogpData}
			loading={ogpLoading}
			onDismiss={() => { ogpDismissed = true; ogpLocked = false; }}
		/>
	{/if}

	<div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0 relative" bind:clientHeight={toolbarHeight}>
		<div class="flex items-center gap-3">
			<button
				onclick={() => mediaFileInput.click()}
				disabled={!canAddMedia && video !== null}
				class="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#0085ff]
					disabled:opacity-30 disabled:cursor-not-allowed"
				aria-label={t.post.ariaAddMedia}
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
				</svg>
			</button>
			<button
				onclick={() => {
					cursorPos = textareaEl?.selectionStart ?? cursorPos;
					showEmojiPicker = !showEmojiPicker;
				}}
				class="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#0085ff] {showEmojiPicker ? 'text-[#0085ff] bg-blue-50 dark:bg-blue-950' : ''}"
				aria-label={t.post.ariaAddEmoji}
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
				</svg>
			</button>
		</div>
		<CharCounter count={charCount} />
	</div>
</div>

{#if showEmojiPicker}
	<EmojiPicker onSelect={handleEmojiSelect} onClose={() => { showEmojiPicker = false; }} />
{/if}

{#if showMentionSuggestions}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed left-0 right-0 max-w-md mx-auto z-50 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden"
		style="bottom: {vpOffsetBottom + 64 + toolbarHeight}px; max-height: 192px; overflow-y: auto;"
		data-mention-suggestions
		onmousedown={(e) => e.preventDefault()}
	>
		<MentionSuggestions
			actors={mentionActors}
			loading={mentionLoading}
			focusIndex={mentionFocusIdx}
			onSelect={handleMentionSelect}
		/>
	</div>
{/if}

<input
	bind:this={mediaFileInput}
	type="file"
	accept="image/*,video/*"
	multiple
	class="hidden"
	onchange={handleMediaFileChange}
/>
