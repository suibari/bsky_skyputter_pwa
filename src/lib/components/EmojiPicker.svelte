<script lang="ts">
	import { getFrequentEmojis } from '$lib/stores/emoji-frequency.svelte';
	import { getT } from '$lib/stores/language.svelte';

	type Props = {
		onSelect: (emoji: string) => void;
		onClose: () => void;
	};

	const { onSelect, onClose }: Props = $props();

	const t = $derived(getT());

	const BASE_CATEGORIES: { key: keyof typeof t.emojiCategories; emojis: string[] }[] = [
		{
			key: 'faceEmotion',
			emojis: [
				'😀','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘',
				'😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐',
				'😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮',
				'🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯',
				'😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
				'😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾',
				'🤖'
			]
		},
		{
			key: 'handPeople',
			emojis: [
				'👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆',
				'🖕','👇','☝','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍',
				'💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','👁','👀','👤','🫶','❤️‍🔥',
			]
		},
		{
			key: 'heartSymbol',
			emojis: [
				'❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
				'💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','☯️','☦️','🛐','⛎','♈','♉','♊',
				'♋','♌','♍','♎','♏','♐','♑','♒','♓','⛔','🚫','💯','‼️','⁉️','🔅','🔆','🔱',
				'⚜️','🔰','♻️','✅','❎','🆗','🆙','🆒','🆕','🆓','🔟','🔠','🔡','🔢','🔣','🔤',
				'🅰️','🅱️','🆎','🅾️','🆑','🆘','❌','⭕','🛑','⛔','📛','🔞','🔕','🔇','✨','⭐',
				'🌟','💫','⚡','🔥','🌈'
			]
		},
		{
			key: 'natureAnimal',
			emojis: [
				'🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
				'🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛',
				'🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞',
				'🦀','🐡','🐟','🐠','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘',
				'🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🌸','🌺','🌻','🌹','🍀','🌿','🍃','🌴',
				'🌊','🌋','🌌','🌠','⛅','🌤','⛈','🌧','❄️','☃️','⛄','🌬','💨','🌪'
			]
		},
		{
			key: 'foodDrink',
			emojis: [
				'🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑',
				'🥦','🥬','🥒','🌽','🍄','🥕','🧄','🧅','🥔','🍞','🥐','🥖','🫓','🥨','🥯','🧀',
				'🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫔','🌮','🌯',
				'🥙','🧆','🥚','🍜','🍝','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥',
				'🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩',
				'🍪','🌰','🍯','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹'
			]
		},
		{
			key: 'activity',
			emojis: [
				'⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥍','🏑','🏏',
				'🪃','🥅','⛳','🪁','🏹','🎣','🤿','🎽','🎿','🛷','🥌','🪂','🏋','🤸','⛹','🤺',
				'🏇','⛷','🏂','🪵','🏊','🚣','🧗','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🎗','🎫',
				'🎟','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗',
				'🎸','🪕','🎻','🎲','♟','🎯','🎳','🎮','🕹','🧩'
			]
		},
		{
			key: 'travel',
			emojis: [
				'🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵',
				'🛺','🚲','🛴','🛹','🛼','🛶','⛵','🚤','🛥','🚢','✈','🛩','🛫','🛬','🛸','🚁',
				'🚀','🛰','💺','⛽','🚧','🚦','🚥','🛣','🗺','🗾','🧭','🏔','⛰','🌁','🏙','🌃',
				'🌄','🌅','🌆','🌇','🌉','🎠','🎡','🎢','⛲','🌏','🗼','🗽','🏰','🏯','🏟','🕌',
				'🛕','⛪','🕍','🕋','⛩','🌐','🗺'
			]
		},
		{
			key: 'object',
			emojis: [
				'💌','🗑','📦','📬','📮','📪','📫','📭','📬','📮','📯','📢','📣','📻','📱','📲',
				'☎','📞','📟','📠','💡','🔦','🕯','🪔','🧲','🔭','🔬','🧬','🦠','💊','🩹','🩺',
				'💉','🩻','🩼','🩺','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🛒','🚪',
				'🛏','🛋','🚽','🪠','🚿','🛁','🪞','🪟','🧸','🖼','🛍','🎁','🎀','🎊','🎉','🎈',
				'🎏','🎐','🎑','🧧','🎋','🎍','🎎','🎃','🎄','🧨','✨','🎆','🎇','🧿','📿','💎',
				'🔮','🪬','🪄','🎴','🃏','🀄','🪅','🎭','🖊','📝','✏','📏','📐','✂','🗃','📋'
			]
		}
	];

	const categories = $derived(BASE_CATEGORIES.map((c) => ({ label: t.emojiCategories[c.key], emojis: c.emojis })));

	let frequentEmojis = $state<string[]>([]);

	$effect(() => {
		frequentEmojis = getFrequentEmojis(16);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50"
	onmousedown={onClose}
	ontouchstart={onClose}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute bottom-20 left-0 right-0 mx-2 max-h-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl flex flex-col overflow-hidden"
		onmousedown={(e) => e.stopPropagation()}
		ontouchstart={(e) => e.stopPropagation()}
	>
		<div class="overflow-y-auto flex-1 p-3 space-y-3">
			{#if frequentEmojis.length > 0}
				<div>
					<p class="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-1.5 px-0.5">{t.emojiCategories.recent}</p>
					<div class="flex flex-wrap gap-0.5">
						{#each frequentEmojis as emoji (emoji)}
							<button
								onclick={() => onSelect(emoji)}
								class="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
							>{emoji}</button>
						{/each}
					</div>
				</div>
				<hr class="border-gray-100 dark:border-gray-700" />
			{/if}

			{#each categories as cat}
				<div>
					<p class="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-1.5 px-0.5">{cat.label}</p>
					<div class="flex flex-wrap gap-0.5">
						{#each cat.emojis as emoji}
							<button
								onclick={() => onSelect(emoji)}
								class="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
							>{emoji}</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
