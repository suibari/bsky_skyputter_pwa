import type { Translation } from './index';

export const ja: Translation = {
	nav: {
		post: '投稿',
		notifications: '通知',
		drafts: '下書き',
		profile: 'プロフ',
		settings: '設定'
	},

	common: {
		cancel: 'キャンセル',
		delete: '削除',
		loading: '読み込み中...',
		loadAll: 'すべて読み込みました',
		close: '閉じる'
	},

	time: {
		justNow: 'たった今',
		minutesAgo: (m) => `${m}分前`,
		hoursAgo: (h) => `${h}時間前`,
		daysAgo: (d) => `${d}日前`
	},

	login: {
		catchphrase: 'アウトプッターのための半投稿専用＋通知Blueskyクライアント',
		description:
			'タイムラインを見ている余裕はない、だけどアウトプットはしたいし、リプライにも応えたい。そんなあなたのためのアプリです。',
		feature1Title: 'タイムラインを見れません',
		feature1Body: 'インプットを絞って、アウトプットに集中しよう。',
		feature2Title: '通知はリアルタイムで受けられます',
		feature2Body: 'みんなからのリアクションを受け止めよう。',
		feature3Title: 'いいねの数はみれません',
		feature3Body: 'マインドフルネスで、今受けたいいねをかみしめよう。',
		loginWithPassword: 'App Password でログイン',
		loginWithBluesky: 'Bluesky でログイン',
		dividerOr: 'または',
		privacyPolicy: 'プライバシーポリシー',
		tagline: 'しずか、でもとどく',
		errors: {
			handleRequired: 'Handle を入力してください',
			oauthFailed: 'OAuth ログインに失敗しました',
			loginFailed: 'ログインに失敗しました'
		}
	},

	post: {
		draft: '下書き',
		post: '投稿',
		editingDraft: '下書きを編集中',
		placeholder: 'いまなにしてる？',
		replyPlaceholder: '返信する...',
		quotePlaceholder: '引用コメントを入力...',
		replyLabel: (handle) => `↩ 返信先 @${handle}`,
		quoteLabel: (handle) => `❝ 引用 @${handle}`,
		cancelReply: '返信をキャンセル',
		cancelQuote: '引用をキャンセル',
		ariaAddMedia: 'メディアを追加',
		ariaAddEmoji: '絵文字を追加',
		ariaAvatar: 'アバター',
		processingVideo: (progress) =>
			progress !== null ? `動画を処理中... ${progress}%` : '動画を処理中...',
		toast: {
			posted: '投稿しました',
			postFailed: '投稿に失敗しました',
			draftSaved: '下書きを保存しました',
			draftSaveFailed: '下書きの保存に失敗しました',
			mediaConflict: '動画と画像は同時に添付できません'
		}
	},

	notifications: {
		header: '通知',
		empty: '通知はありません',
		toast: {
			loadFailed: '読み込みに失敗しました',
			liked: 'いいねしました',
			likeFailed: 'いいねに失敗しました'
		}
	},

	notificationItem: {
		reasons: {
			like: 'いいねしました',
			likeViaRepost: 'あなたのリポストにいいねしました',
			repost: 'リポストしました',
			repostViaRepost: 'あなたのリポストをリポストしました',
			follow: 'フォローしました',
			mention: 'にメンションしました',
			reply: '返信しました',
			quote: 'を引用しました',
			subscribedPost: '投稿しました'
		},
		others: (n: number) => `他${n}人`,
		ariaExpand: '展開する',
		ariaCollapse: '折りたたむ',
		ariaZoomImage: '画像を拡大',
		ariaPlayVideo: '動画を再生',
		ariaLike: 'いいね',
		ariaReply: '返信',
		ariaQuote: '引用',
		altAttachedImage: '添付画像',
		altVideoThumbnail: '動画サムネイル'
	},

	drafts: {
		header: '下書き',
		empty: '下書きがありません',
		noText: '（テキストなし）',
		imageCount: (n) => `📷 ${n}枚`,
		ariaDelete: '下書きを削除',
		altThumbnail: '下書きサムネイル',
		modal: {
			title: '下書きを削除',
			message: 'この下書きを削除しますか？'
		},
		toast: {
			deleted: '下書きを削除しました',
			deleteFailed: '削除に失敗しました'
		}
	},

	profile: {
		header: 'プロフィール',
		empty: 'まだ投稿がありません',
		follows: 'フォロー',
		followers: 'フォロワー',
		posts: '投稿',
		ariaAvatar: 'アバター',
		modal: {
			title: '投稿を削除',
			message: 'この投稿を削除しますか？この操作は取り消せません。'
		},
		toast: {
			deleted: '削除しました',
			deleteFailed: '削除に失敗しました',
			loadFailed: '読み込みに失敗しました'
		}
	},

	settings: {
		header: '設定',
		ariaAvatar: 'アバター',
		sections: {
			theme: 'テーマ',
			notifications: '通知設定',
			account: 'アカウント',
			about: 'SkyPutterについて',
			language: '言語'
		},
		theme: {
			system: 'システム',
			light: 'ライト',
			dark: 'ダーク'
		},
		push: {
			title: 'Push通知',
			description: '新着通知をプッシュ通知で受け取る',
			ariaLabel: 'Push通知'
		},
		language: {
			ja: '日本語',
			en: 'English'
		},
		logout: 'ログアウト',
		about: {
			tagline: 'しずか、でもとどく',
			description:
				'Blueskyへの半投稿専用PWA。タイムラインは持たず、投稿・自分の投稿一覧・通知・下書きに機能を絞る。インプット過多による消耗を防ぎ、アウトプットに集中するクリエイターのためのアプリ。'
		},
		toast: {
			pushOn: 'Push通知をオンにしました',
			pushOff: 'Push通知をオフにしました',
			pushPermissionRequired: '通知の許可が必要です',
			pushNotSupported: 'このブラウザはPush通知に対応していません',
			pushFailed: 'エラーが発生しました'
		}
	},

	oauthCallback: {
		processing: 'ログイン処理中...'
	},

	imageViewer: {
		ariaClose: '閉じる',
		ariaPrev: '前の画像',
		ariaNext: '次の画像',
		altImage: '画像'
	},

	imagePicker: {
		ariaAdd: '画像を追加',
		ariaRemove: '画像を削除',
		altPreview: (n) => `添付画像 ${n}`
	},

	videoPicker: {
		ariaAdd: '動画を追加',
		ariaRemove: '動画を削除',
		label: '動画'
	},

	emojiCategories: {
		recent: 'よく使う',
		faceEmotion: '顔・感情',
		handPeople: '手・人',
		heartSymbol: 'ハート・記号',
		natureAnimal: '自然・動物',
		foodDrink: '食べ物・飲み物',
		activity: '活動・スポーツ',
		travel: '旅行・場所',
		object: '物・その他'
	},

	modal: {
		cancel: 'キャンセル'
	},

	linkCard: {
		ariaRemove: 'リンクカードを削除'
	},

	mentionSuggestions: {
		notFound: '見つかりませんでした'
	},

	postCard: {
		ariaZoomImage: '画像を拡大',
		ariaPlayVideo: '動画を再生',
		ariaReply: 'リプライ',
		ariaQuote: '引用',
		ariaDelete: '削除',
		altAttachedImage: '添付画像',
		altVideoThumbnail: '動画サムネイル'
	},

	infiniteScroll: {
		loadAll: 'すべて読み込みました'
	},

	loadingSpinner: {
		ariaLabel: '読み込み中'
	},

	privacyPolicy: {
		title: 'プライバシーポリシー',
		sections: [
			{
				heading: '1. はじめに',
				content:
					'SkyPutter（以下「本アプリ」）は、Bluesky (AT Protocol) を利用した半投稿専用 PWA クライアントです。本ポリシーでは、本アプリが収集・利用する情報について説明します。'
			},
			{
				heading: '2. 収集する情報',
				content: {
					type: 'list',
					items: [
						'Bluesky 認証情報: ログイン時に取得する DID・ハンドル・アクセストークン。端末のローカルストレージに保存され、API リクエストの認証に使用されます。',
						'Push 通知トークン: Web Push 通知を有効にした場合、ブラウザが発行するサブスクリプション情報をサーバーに保存します。通知の配信にのみ使用し、それ以外の目的には使用しません。',
						'下書きデータ: 作成した下書きは、ユーザー自身の Bluesky PDS（Personal Data Server）に保存されます。本アプリのサーバーおよびブラウザには保存されません。'
					]
				}
			},
			{
				heading: '3. 情報の利用目的',
				content: {
					type: 'list',
					items: [
						'Bluesky への投稿・通知取得などのアプリ機能の提供',
						'Web Push 通知の配信'
					]
				}
			},
			{
				heading: '4. 第三者への提供',
				content:
					'本アプリは、Bluesky (AT Protocol) の公開 API を通じてのみデータをやり取りします。収集した個人情報を、法令に基づく場合を除き第三者に提供・開示することはありません。'
			},
			{
				heading: '5. データの削除',
				content:
					'Push 通知の登録解除はアプリの設定画面から行えます。ブラウザのデータ消去またはアプリのアンインストールにより、端末上のデータ（認証情報・下書き）はすべて削除されます。'
			},
			{
				heading: '6. お問い合わせ',
				content: {
					type: 'paragraph-with-link',
					before: '本ポリシーに関するお問い合わせは、Bluesky 上のアカウント ',
					linkHref: 'https://bsky.app/profile/suibari.com',
					linkLabel: '@suibari.com',
					after: ' へのメンションまたはリプライにてお願いします。'
				}
			}
		],
		lastUpdated: '最終更新: 2026年6月'
	}
};
