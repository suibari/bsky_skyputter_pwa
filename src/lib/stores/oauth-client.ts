import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { PUBLIC_ATPROTO_CLIENT_ID, PUBLIC_ATPROTO_REDIRECT_URI } from '$env/static/public';

export const oauthClient = new BrowserOAuthClient({
	handleResolver: 'https://bsky.social',
	clientMetadata: {
		client_id: PUBLIC_ATPROTO_CLIENT_ID,
		client_name: 'SkyPutter',
		redirect_uris: [PUBLIC_ATPROTO_REDIRECT_URI],
		scope: 'atproto transition:generic',
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],
		token_endpoint_auth_method: 'none',
		application_type: 'web',
		dpop_bound_access_tokens: true,
	},
});
