export type Language = 'ja' | 'en';

export interface PrivacyPolicySection {
	heading: string;
	content:
		| string
		| { type: 'list'; items: string[] }
		| { type: 'paragraph-with-link'; before: string; linkHref: string; linkLabel: string; after: string };
}

export interface Translation {
	nav: {
		post: string;
		notifications: string;
		drafts: string;
		profile: string;
		settings: string;
	};

	common: {
		cancel: string;
		delete: string;
		repost: string;
		loading: string;
		loadAll: string;
		close: string;
	};

	time: {
		justNow: string;
		minutesAgo: (m: number) => string;
		hoursAgo: (h: number) => string;
		daysAgo: (d: number) => string;
	};

	login: {
		catchphrase: string;
		description: string;
		feature1Title: string;
		feature1Body: string;
		feature2Title: string;
		feature2Body: string;
		feature3Title: string;
		feature3Body: string;
		loginWithPassword: string;
		loginWithBluesky: string;
		dividerOr: string;
		privacyPolicy: string;
		tagline: string;
		errors: {
			handleRequired: string;
			oauthFailed: string;
			loginFailed: string;
		};
	};

	post: {
		draft: string;
		post: string;
		editingDraft: string;
		placeholder: string;
		replyPlaceholder: string;
		quotePlaceholder: string;
		replyLabel: (handle: string) => string;
		quoteLabel: (handle: string) => string;
		cancelReply: string;
		cancelQuote: string;
		ariaAddMedia: string;
		ariaAddEmoji: string;
		ariaAvatar: string;
		processingVideo: (progress: number | null) => string;
		toast: {
			posted: string;
			postFailed: string;
			draftSaved: string;
			draftSaveFailed: string;
			mediaConflict: string;
		};
	};

	notifications: {
		header: string;
		empty: string;
		toast: {
			loadFailed: string;
			liked: string;
			likeFailed: string;
			reposted: string;
			repostFailed: string;
		};
	};

	notificationItem: {
		reasons: {
			like: string;
			likeViaRepost: string;
			repost: string;
			repostViaRepost: string;
			follow: string;
			mention: string;
			reply: string;
			quote: string;
			subscribedPost: string;
			repostNextPost: string;
		};
		others: (n: number) => string;
		ariaExpand: string;
		ariaCollapse: string;
		ariaZoomImage: string;
		ariaPlayVideo: string;
		ariaLike: string;
		ariaRepost: string;
		ariaReply: string;
		ariaQuote: string;
		altAttachedImage: string;
		altVideoThumbnail: string;
	};

	drafts: {
		header: string;
		empty: string;
		noText: string;
		imageCount: (n: number) => string;
		ariaDelete: string;
		altThumbnail: string;
		modal: {
			title: string;
			message: string;
		};
		toast: {
			deleted: string;
			deleteFailed: string;
		};
	};

	profile: {
		header: string;
		empty: string;
		follows: string;
		followers: string;
		posts: string;
		ariaAvatar: string;
		modal: {
			title: string;
			message: string;
		};
		toast: {
			deleted: string;
			deleteFailed: string;
			loadFailed: string;
			reposted: string;
			repostFailed: string;
		};
		hashtagSearch: {
			title: (tag: string) => string;
			empty: string;
			loadFailed: string;
		};
	};

	settings: {
		header: string;
		ariaAvatar: string;
		sections: {
			theme: string;
			notifications: string;
			display: string;
			account: string;
			about: string;
			language: string;
		};
		theme: {
			system: string;
			light: string;
			dark: string;
		};
		push: {
			title: string;
			description: string;
			ariaLabel: string;
		};
		repostNextPost: {
			title: string;
			description: string;
			ariaLabel: string;
		};
		language: {
			ja: string;
			en: string;
		};
		logout: string;
		about: {
			tagline: string;
			description: string;
		};
		toast: {
			pushOn: string;
			pushOff: string;
			pushPermissionRequired: string;
			pushNotSupported: string;
			pushFailed: string;
			repostNextPostFailed: string;
		};
	};

	oauthCallback: {
		processing: string;
	};

	imageViewer: {
		ariaClose: string;
		ariaPrev: string;
		ariaNext: string;
		altImage: string;
	};

	imagePicker: {
		ariaAdd: string;
		ariaRemove: string;
		altPreview: (n: number) => string;
		altModal: {
			title: string;
			placeholder: string;
			save: string;
			ariaOpen: (n: number) => string;
			charCount: (n: number) => string;
		};
	};

	videoPicker: {
		ariaAdd: string;
		ariaRemove: string;
		label: string;
	};

	emojiCategories: {
		recent: string;
		faceEmotion: string;
		handPeople: string;
		heartSymbol: string;
		natureAnimal: string;
		foodDrink: string;
		activity: string;
		travel: string;
		object: string;
	};

	modal: {
		cancel: string;
	};

	linkCard: {
		ariaRemove: string;
	};

	mentionSuggestions: {
		notFound: string;
	};

	postCard: {
		ariaZoomImage: string;
		ariaPlayVideo: string;
		ariaRepost: string;
		ariaReply: string;
		ariaQuote: string;
		ariaDelete: string;
		altAttachedImage: string;
		altVideoThumbnail: string;
		youReposted: string;
	};

	repostModal: {
		title: string;
		message: string;
	};

	infiniteScroll: {
		loadAll: string;
	};

	loadingSpinner: {
		ariaLabel: string;
	};

	privacyPolicy: {
		title: string;
		sections: PrivacyPolicySection[];
		lastUpdated: string;
	};
}
