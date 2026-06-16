type ToastType = 'success' | 'error' | 'info';

type Toast = {
	id: string;
	message: string;
	type: ToastType;
};

let toasts = $state<Toast[]>([]);

export function getToasts(): Toast[] {
	return toasts;
}

export function showToast(message: string, type: ToastType = 'info'): void {
	const id = crypto.randomUUID();
	toasts = [...toasts, { id, message, type }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, 3000);
}
