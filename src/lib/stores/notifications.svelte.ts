let unreadCount = $state(0);
let notificationsTapCount = $state(0);

export function getUnreadCount(): number {
	return unreadCount;
}

export function setUnreadCount(n: number): void {
	unreadCount = n;
}

export function getNotificationsTapCount(): number {
	return notificationsTapCount;
}

export function triggerNotificationsTap(): void {
	notificationsTapCount++;
}
