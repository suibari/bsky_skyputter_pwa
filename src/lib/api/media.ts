import type { BlobRef } from '@atproto/api';
import { createAgent } from './agent';

const IMAGE_MAX_BYTES = 1_000_000; // 1MB (Bluesky API limit)

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
	const agent = createAgent();
	const res = await agent.uploadBlob(compressed, { encoding: compressed.type });
	return res.data.blob;
}

export async function uploadVideo(file: File): Promise<BlobRef> {
	const agent = createAgent();

	const arrayBuffer = await file.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	const uploadRes = await agent.api.app.bsky.video.uploadVideo(uint8Array, {
		headers: { 'Content-Type': file.type }
	});

	const jobId = uploadRes.data.jobStatus.jobId;
	const startTime = Date.now();
	const timeout = 60_000;

	while (Date.now() - startTime < timeout) {
		const statusRes = await agent.api.app.bsky.video.getJobStatus({ jobId });
		const { state, blob } = statusRes.data.jobStatus;

		if (state === 'JOB_STATE_COMPLETED' && blob) {
			return blob;
		}
		if (state === 'JOB_STATE_FAILED') {
			throw new Error('動画の処理に失敗しました');
		}

		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	throw new Error('動画の処理がタイムアウトしました');
}
