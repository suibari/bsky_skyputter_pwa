let unreadCount = $state(0);
let notificationsTapCount = $state(0);
let notificationsPushCount = $state(0);
let notificationsPushShouldMarkSeen = $state(false);

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

export function getNotificationsPushCount(): number {
	return notificationsPushCount;
}

export function shouldMarkSeenOnNotificationsPush(): boolean {
	return notificationsPushShouldMarkSeen;
}

export function triggerNotificationsPush(shouldMarkSeen = false): void {
	notificationsPushShouldMarkSeen = shouldMarkSeen;
	notificationsPushCount++;
}
