import type { BlobRef } from '@atproto/api';
import { createAgent } from './agent';

export async function uploadImage(file: File): Promise<BlobRef> {
	const agent = createAgent();
	const res = await agent.uploadBlob(file, { encoding: file.type });
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
