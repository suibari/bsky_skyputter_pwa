<script lang="ts">
	let { count, max = 300 }: { count: number; max?: number } = $props();

	const remaining = $derived(max - count);
	const pct = $derived(Math.min(count / max, 1));
	const isNear = $derived(remaining <= 20);
	const isOver = $derived(remaining < 0);

	const r = 10;
	const circumference = 2 * Math.PI * r;
	const dashOffset = $derived(circumference * (1 - pct));
	const strokeColor = $derived(isOver ? '#ef4444' : isNear ? '#f59e0b' : '#0085ff');
</script>

<div class="relative w-8 h-8 flex items-center justify-center shrink-0">
	<svg viewBox="0 0 24 24" class="absolute inset-0 -rotate-90 w-full h-full">
		<circle cx="12" cy="12" r={r} fill="none" stroke="#e5e7eb" stroke-width="2" />
		<circle
			cx="12"
			cy="12"
			r={r}
			fill="none"
			stroke={strokeColor}
			stroke-width="2"
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
			stroke-linecap="round"
		/>
	</svg>
	<span class="text-[10px] font-medium {isOver ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-gray-400'}">
		{remaining}
	</span>
</div>
