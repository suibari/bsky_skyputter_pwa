export type Session = {
	accessJwt?: string;
	refreshJwt?: string;
	did: string;
	handle: string;
	avatar?: string;
	type?: 'oauth' | 'app-password';
};
