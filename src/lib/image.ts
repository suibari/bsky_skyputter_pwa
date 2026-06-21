export function avatarThumbnail(url: string | undefined): string | undefined {
	return url?.replace('/img/avatar/', '/img/avatar_thumbnail/');
}
