let unreadCount = $state(0);

export function getUnreadCount(): number {
	return unreadCount;
}

export function setUnreadCount(n: number): void {
	unreadCount = n;
}
