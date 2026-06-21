import type { Translation } from './index';

export const en: Translation = {
	nav: {
		post: 'Post',
		notifications: 'Alerts',
		drafts: 'Drafts',
		profile: 'Profile',
		settings: 'Settings'
	},

	common: {
		cancel: 'Cancel',
		delete: 'Delete',
		loading: 'Loading...',
		loadAll: 'All loaded',
		close: 'Close'
	},

	time: {
		justNow: 'Just now',
		minutesAgo: (m) => `${m}m ago`,
		hoursAgo: (h) => `${h}h ago`,
		daysAgo: (d) => `${d}d ago`
	},

	login: {
		catchphrase: 'A focused Bluesky client for output-first creators',
		description:
			"No time to scroll a timeline, but you still want to post and respond to replies. That's what this app is for.",
		feature1Title: "No timeline",
		feature1Body: 'Limit your input and focus on output.',
		feature2Title: 'Real-time notifications',
		feature2Body: 'Receive reactions from your audience instantly.',
		feature3Title: 'No like counts',
		feature3Body: 'Stay mindful and savor each like as it comes.',
		loginWithPassword: 'Login with App Password',
		loginWithBluesky: 'Login with Bluesky',
		dividerOr: 'or',
		privacyPolicy: 'Privacy Policy',
		tagline: 'Quiet, but it reaches.',
		errors: {
			handleRequired: 'Please enter your handle',
			oauthFailed: 'OAuth login failed',
			loginFailed: 'Login failed'
		}
	},

	post: {
		draft: 'Draft',
		post: 'Post',
		editingDraft: 'Editing draft',
		placeholder: "What's happening?",
		replyPlaceholder: 'Write a reply...',
		quotePlaceholder: 'Add a comment...',
		replyLabel: (handle) => `↩ Reply to @${handle}`,
		quoteLabel: (handle) => `❝ Quote @${handle}`,
		cancelReply: 'Cancel reply',
		cancelQuote: 'Cancel quote',
		ariaAddMedia: 'Add media',
		ariaAddEmoji: 'Add emoji',
		ariaAvatar: 'Avatar',
		processingVideo: (progress) =>
			progress !== null ? `Processing video... ${progress}%` : 'Processing video...',
		toast: {
			posted: 'Posted!',
			postFailed: 'Failed to post',
			draftSaved: 'Draft saved',
			draftSaveFailed: 'Failed to save draft',
			mediaConflict: 'Cannot attach video and images together'
		}
	},

	notifications: {
		header: 'Notifications',
		empty: 'No notifications',
		toast: {
			loadFailed: 'Failed to load',
			liked: 'Liked!',
			likeFailed: 'Failed to like'
		}
	},

	notificationItem: {
		reasons: {
			like: 'liked your post',
			repost: 'reposted your post',
			follow: 'followed you',
			mention: 'mentioned you',
			reply: 'replied to you',
			quote: 'quoted your post',
			subscribedPost: 'posted'
		},
		ariaExpand: 'Expand',
		ariaCollapse: 'Collapse',
		ariaZoomImage: 'View image',
		ariaPlayVideo: 'Play video',
		ariaLike: 'Like',
		ariaReply: 'Reply',
		ariaQuote: 'Quote',
		altAttachedImage: 'Attached image',
		altVideoThumbnail: 'Video thumbnail'
	},

	drafts: {
		header: 'Drafts',
		empty: 'No drafts',
		noText: '(no text)',
		imageCount: (n) => `📷 ${n} image${n > 1 ? 's' : ''}`,
		ariaDelete: 'Delete draft',
		altThumbnail: 'Draft thumbnail',
		modal: {
			title: 'Delete draft',
			message: 'Are you sure you want to delete this draft?'
		},
		toast: {
			deleted: 'Draft deleted',
			deleteFailed: 'Failed to delete'
		}
	},

	profile: {
		header: 'Profile',
		empty: 'No posts yet',
		follows: 'Following',
		followers: 'Followers',
		posts: 'Posts',
		ariaAvatar: 'Avatar',
		modal: {
			title: 'Delete post',
			message: 'Are you sure you want to delete this post? This cannot be undone.'
		},
		toast: {
			deleted: 'Deleted',
			deleteFailed: 'Failed to delete',
			loadFailed: 'Failed to load'
		}
	},

	settings: {
		header: 'Settings',
		ariaAvatar: 'Avatar',
		sections: {
			theme: 'Theme',
			notifications: 'Notifications',
			account: 'Account',
			about: 'About SkyPutter',
			language: 'Language'
		},
		theme: {
			system: 'System',
			light: 'Light',
			dark: 'Dark'
		},
		push: {
			title: 'Push notifications',
			description: 'Receive new notifications via push',
			ariaLabel: 'Push notifications'
		},
		language: {
			ja: '日本語',
			en: 'English'
		},
		logout: 'Logout',
		about: {
			tagline: 'Quiet, but it reaches.',
			description:
				'A focused PWA for Bluesky. No timeline — just post, view your posts, check notifications, and manage drafts. Designed for creators who want to stay focused on output.'
		},
		toast: {
			pushOn: 'Push notifications enabled',
			pushOff: 'Push notifications disabled',
			pushPermissionRequired: 'Notification permission required',
			pushNotSupported: 'Push notifications are not supported in this browser',
			pushFailed: 'An error occurred'
		}
	},

	oauthCallback: {
		processing: 'Signing in...'
	},

	imageViewer: {
		ariaClose: 'Close',
		ariaPrev: 'Previous image',
		ariaNext: 'Next image',
		altImage: 'Image'
	},

	imagePicker: {
		ariaAdd: 'Add image',
		ariaRemove: 'Remove image',
		altPreview: (n) => `Attached image ${n}`
	},

	videoPicker: {
		ariaAdd: 'Add video',
		ariaRemove: 'Remove video',
		label: 'Video'
	},

	emojiCategories: {
		recent: 'Frequently used',
		faceEmotion: 'Faces & Emotions',
		handPeople: 'Hands & People',
		heartSymbol: 'Hearts & Symbols',
		natureAnimal: 'Nature & Animals',
		foodDrink: 'Food & Drink',
		activity: 'Activities & Sports',
		travel: 'Travel & Places',
		object: 'Objects & More'
	},

	modal: {
		cancel: 'Cancel'
	},

	linkCard: {
		ariaRemove: 'Remove link card'
	},

	mentionSuggestions: {
		notFound: 'No results found'
	},

	postCard: {
		ariaZoomImage: 'View image',
		ariaPlayVideo: 'Play video',
		ariaReply: 'Reply',
		ariaQuote: 'Quote',
		ariaDelete: 'Delete',
		altAttachedImage: 'Attached image',
		altVideoThumbnail: 'Video thumbnail'
	},

	infiniteScroll: {
		loadAll: 'All loaded'
	},

	loadingSpinner: {
		ariaLabel: 'Loading'
	},

	privacyPolicy: {
		title: 'Privacy Policy',
		sections: [
			{
				heading: '1. Introduction',
				content:
					'SkyPutter (the "App") is a focused PWA client for Bluesky (AT Protocol). This policy describes what information the App collects and how it is used.'
			},
			{
				heading: '2. Information We Collect',
				content: {
					type: 'list',
					items: [
						'Bluesky credentials: DID, handle, and access token obtained at login. Stored in local storage on your device and used only to authenticate API requests.',
						'Push notification token: When you enable Web Push notifications, your browser subscription is stored on our server and used only to deliver notifications.',
						'Draft data: Drafts you create are saved to your own Bluesky PDS (Personal Data Server). They are not stored on the App server or in the browser.'
					]
				}
			},
			{
				heading: '3. How We Use Your Information',
				content: {
					type: 'list',
					items: [
						'To provide app features such as posting to Bluesky and retrieving notifications.',
						'To deliver Web Push notifications.'
					]
				}
			},
			{
				heading: '4. Third-Party Disclosure',
				content:
					'The App exchanges data only through the public API of Bluesky (AT Protocol). We do not share or disclose collected personal information to third parties except as required by law.'
			},
			{
				heading: '5. Data Deletion',
				content:
					"You can unsubscribe from push notifications in the App's settings. Clearing your browser data or uninstalling the App will delete all local data (credentials and drafts)."
			},
			{
				heading: '6. Contact',
				content: {
					type: 'paragraph-with-link',
					before: 'For questions about this policy, please mention or reply to ',
					linkHref: 'https://bsky.app/profile/suibari.com',
					linkLabel: '@suibari.com',
					after: ' on Bluesky.'
				}
			}
		],
		lastUpdated: 'Last updated: June 2026'
	}
};
