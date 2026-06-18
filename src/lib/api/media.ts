import type { BlobRef } from '@atproto/api';
import { createAgent } from './agent';

const IMAGE_MAX_BYTES = 1_000_000; // 1MB (Bluesky API limit)
const VIDEO_MAX_BYTES = 300_000_000; // 300MB

async function compressImage(file: File): Promise<File> {
	if (file.size <= IMAGE_MAX_BYTES) return file;

	const img = await createImageBitmap(file);
	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(img, 0, 0);

	const outName = file.name.replace(/\.[^.]+$/, '.jpg');

	for (let quality = 0.85; quality >= 0.3; quality -= 0.1) {
		const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
		if (blob && blob.size <= IMAGE_MAX_BYTES) {
			return new File([blob], outName, { type: 'image/jpeg' });
		}
	}

	for (let scale = 0.7; scale >= 0.2; scale -= 0.1) {
		canvas.width = Math.floor(img.width * scale);
		canvas.height = Math.floor(img.height * scale);
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
		if (blob && blob.size <= IMAGE_MAX_BYTES) {
			return new File([blob], outName, { type: 'image/jpeg' });
		}
	}

	throw new Error('画像が大きすぎて圧縮できません');
}

export async function uploadImage(file: File): Promise<BlobRef> {
	const compressed = await compressImage(file);
	const agent = await createAgent();
	const res = await agent.uploadBlob(compressed, { encoding: compressed.type });
	return res.data.blob;
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
		img.onerror = () => { resolve({ width: 1, height: 1 }); URL.revokeObjectURL(url); };
		img.src = url;
	});
}

const VIDEO_SERVICE_URL = 'https://video.bsky.app';
const VIDEO_SERVICE_DID = 'did:web:video.bsky.app';

async function getPdsDid(did: string): Promise<string> {
	if (did.startsWith('did:web:')) {
		return `did:web:${did.slice('did:web:'.length).split('/')[0]}`;
	}
	const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
	if (!res.ok) throw new Error('PDS の情報を取得できませんでした');
	const doc = await res.json();
	const pds = doc.service?.find(
		(s: { type: string }) => s.type === 'AtprotoPersonalDataServer'
	) as { serviceEndpoint: string } | undefined;
	if (!pds?.serviceEndpoint) throw new Error('PDS が見つかりませんでした');
	return `did:web:${new URL(pds.serviceEndpoint).hostname}`;
}

export async function uploadVideo(
	file: File,
	onProgress?: (pct: number) => void
): Promise<BlobRef> {
	if (file.type !== 'video/mp4') {
		throw new Error('動画はMP4形式のみ対応しています');
	}
	if (file.size > VIDEO_MAX_BYTES) {
		throw new Error('動画は300MB以下にしてください');
	}

	const agent = await createAgent();
	const { did } = agent;
	if (!did) throw new Error('Not authenticated');

	const pdsDid = await getPdsDid(did);

	// Step 5: upload token (aud = PDS DID, lxm = uploadBlob)
	const uploadAuthRes = await agent.com.atproto.server.getServiceAuth({
		aud: pdsDid,
		lxm: 'com.atproto.repo.uploadBlob',
		exp: Math.floor(Date.now() / 1000) + 60 * 30
	});
	const uploadToken = uploadAuthRes.data.token;

	// Step 7: start upload (fire without awaiting — large file transfer takes time)
	const uploadParams = new URLSearchParams({ did, name: file.name || 'video.mp4' });
	const uploadPromise = fetch(
		`${VIDEO_SERVICE_URL}/xrpc/app.bsky.video.uploadVideo?${uploadParams}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
				'Content-Type': 'video/mp4'
			},
			body: file
		}
	);

	// Step 10: get status token concurrently while upload is streaming
	const statusAuthRes = await agent.com.atproto.server.getServiceAuth({
		aud: VIDEO_SERVICE_DID,
		lxm: 'app.bsky.video.getJobStatus',
		exp: Math.floor(Date.now() / 1000) + 60 * 30
	});
	const statusToken = statusAuthRes.data.token;

	// Step 8: await upload completion, then extract jobId
	const uploadRes = await uploadPromise;
	const uploadData = await uploadRes.json().catch(() => ({}));

	// 200: normal, 409: duplicate (already_exists)
	if (!uploadRes.ok && uploadRes.status !== 409) {
		throw new Error(`[${uploadRes.status}] ${uploadData?.message || '動画のアップロードに失敗しました'}`);
	}

	// blob が既にレスポンスに含まれていれば即返す（409 で COMPLETED の場合など）
	const blobFromUpload = uploadData?.jobStatus?.blob ?? uploadData?.blob;
	if (blobFromUpload) return blobFromUpload as BlobRef;

	// jobId を取得してポーリングへ（jobStatus 内または直下の両方を確認）
	const jobId: string | undefined = uploadData?.jobStatus?.jobId ?? uploadData?.jobId;
	if (!jobId) {
		throw new Error(uploadData?.message ?? '動画のアップロードに失敗しました');
	}

	// Steps 12-14: poll until JOB_STATE_COMPLETED or JOB_STATE_FAILED
	const startTime = Date.now();
	const timeout = 300_000; // 5 minutes

	while (Date.now() - startTime < timeout) {
		const statusRes = await fetch(
			`${VIDEO_SERVICE_URL}/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(jobId)}`,
			{ headers: { Authorization: `Bearer ${statusToken}` } }
		);

		if (!statusRes.ok) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			continue;
		}

		const statusData = await statusRes.json().catch(() => ({}));
		const jobStatus = statusData?.jobStatus;

		if (!jobStatus) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			continue;
		}

		const { state, blob, progress } = jobStatus;

		if (progress != null) {
			onProgress?.(progress);
		}

		if (state === 'JOB_STATE_COMPLETED') {
			if (blob) return blob as BlobRef;
			// COMPLETED but blob not set yet — wait one more cycle
			await new Promise((resolve) => setTimeout(resolve, 2000));
			continue;
		}

		if (state === 'JOB_STATE_FAILED') {
			throw new Error(jobStatus.message || jobStatus.error || '動画の処理に失敗しました');
		}

		// JOB_STATE_CREATED / JOB_STATE_ENCODING / JOB_STATE_SCANNING — keep polling
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	throw new Error('動画の処理がタイムアウトしました');
}

export async function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve) => {
		const video = document.createElement('video');
		const url = URL.createObjectURL(file);
		video.onloadedmetadata = () => {
			resolve({ width: video.videoWidth, height: video.videoHeight });
			URL.revokeObjectURL(url);
		};
		video.onerror = () => {
			resolve({ width: 16, height: 9 });
			URL.revokeObjectURL(url);
		};
		video.src = url;
	});
}
