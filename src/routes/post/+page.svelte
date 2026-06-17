<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import CharCounter from '$lib/components/CharCounter.svelte';
	import ImagePicker from '$lib/components/ImagePicker.svelte';
	import VideoPicker from '$lib/components/VideoPicker.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { getSession } from '$lib/stores/auth.svelte';
	import { createAgent } from '$lib/api/agent';
	import { showToast } from '$lib/stores/toast.svelte';
	import type { BlobRef } from '@atproto/api';
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
	let myAvatar = $state<string | undefined>(getSession()?.avatar);

	const charCount = $derived(text.length);
	const canPost = $derived(charCount > 0 && charCount <= 300 && !posting);
	const canAddImage = $derived(images.length < 4 && video === null);
	const canAddVideo = $derived(images.length === 0 && video === null);

	onMount(async () => {
		const session = getSession();
		if (session) {
			const agent = createAgent();
			const profile = await agent.getProfile({ actor: session.did });
			myAvatar = profile.data.avatar;
		}

		const id = $page.url.searchParams.get('draftId');
		if (id) {
			const draft = await getDraft(id);
			if (draft) {
				text = draft.text;
				draftId = id;
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
				video: uploadedVideo
			});

			if (draftId) {
				await deleteDraft(draftId);
				draftId = null;
			}

			text = '';
			images = [];
			video = null;
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
			const id = draftId ?? crypto.randomUUID();
			const now = new Date().toISOString();
			await saveDraft({
				id,
				text,
				images: images.map((f) => f as Blob),
				createdAt: draftId ? now : now,
				updatedAt: now
			});
			draftId = id;
			showToast('下書きを保存しました', 'success');
		} catch {
			showToast('下書きの保存に失敗しました', 'error');
		} finally {
			savingDraft = false;
		}
	}
</script>

<div class="flex flex-col h-full min-h-dvh">
	<header class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
		<h1 class="text-base font-semibold text-gray-900">今なにしてる？</h1>
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

	<div class="flex-1 flex flex-col px-4 pt-3 gap-3">
		{#if draftId}
			<p class="text-xs text-[#0085ff] bg-blue-50 px-3 py-1.5 rounded-lg">下書きを編集中</p>
		{/if}

		<div class="flex gap-3">
			<div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
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
				placeholder="いまなにしてる？"
				class="flex-1 resize-none text-base text-gray-900 placeholder-gray-400 focus:outline-none min-h-[120px] leading-relaxed"
				rows={5}
			></textarea>
		</div>

		{#if images.length > 0 || canAddImage}
			<div class="pl-13">
				{#if canAddImage}
					<ImagePicker bind:images />
				{:else if images.length > 0}
					<ImagePicker bind:images />
				{/if}
			</div>
		{/if}

		{#if video || canAddVideo}
			<div class="pl-13">
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

	<div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
		<div class="flex items-center gap-3">
			{#if canAddImage}
				<button
					onclick={() => {
						const el = document.querySelector<HTMLButtonElement>('[aria-label="画像を追加"]');
						el?.click();
					}}
					class="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#0085ff]"
					aria-label="画像を追加"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
					</svg>
				</button>
			{/if}
			{#if canAddVideo}
				<button
					onclick={() => {
						const el = document.querySelector<HTMLButtonElement>('[aria-label="動画を追加"]');
						el?.click();
					}}
					class="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#0085ff]"
					aria-label="動画を選択"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
					</svg>
				</button>
			{/if}
		</div>
		<CharCounter count={charCount} />
	</div>
</div>
