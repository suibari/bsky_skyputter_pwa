import { RichText } from '@atproto/api';

export type TextSegment =
	| { type: 'text'; text: string }
	| { type: 'link'; text: string; url: string };

export function parseTextSegments(text: string): TextSegment[] {
	const rt = new RichText({ text });
	rt.detectFacetsWithoutResolution();
	const result: TextSegment[] = [];
	for (const seg of rt.segments()) {
		if (seg.isLink()) {
			result.push({ type: 'link', text: seg.text, url: seg.link!.uri });
		} else {
			result.push({ type: 'text', text: seg.text });
		}
	}
	return result;
}
