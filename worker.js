async function handleRequest(request, env, ctx) {
	const DOMAINS = ['twhlynch.me', '127.0.0.1', 'localhost'];

	const headers = new Headers({
		'Content-Type': 'text/plain',
		'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	});

	// CORS
	const origin = request.headers.get('Origin');
	if (origin) {
		try {
			const hostname = new URL(origin).hostname;
			const domain = hostname.split('.').slice(-2).join('.');
			if (
				DOMAINS.includes(domain) ||
				hostname === 'localhost' ||
				hostname === '127.0.0.1'
			) {
				headers.set('Access-Control-Allow-Origin', origin);
			}
		} catch {
			// ignore malformed headers
		}
	}

	if (request.method === 'OPTIONS') {
		return new Response(null, { headers });
	}

	if (!['POST', 'GET'].includes(request.method)) {
		return new Response('Method Not Allowed', { headers, status: 405 });
	}

	const contentType = request.headers.get('content-type') || '';
	if (
		request.method === 'POST' &&
		contentType &&
		!contentType.includes('application/json')
	) {
		return new Response('Unsupported Media Type', {
			headers,
			status: 415,
		});
	}

	try {
		// login
		const loginRes = await fetch(
			'https://gooberdash-api.winterpixel.io/v2/account/authenticate/email?create=false',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization:
						'Basic OTAyaXViZGFmOWgyZTlocXBldzBmYjlhZWIzOTo=', // static key
				},
				body: JSON.stringify({
					email: env.GD_EMAIL,
					password: env.GD_PASSWORD,
					vars: { client_version: '99999' },
				}),
			},
		);

		if (!loginRes.ok) {
			const msg = await loginRes.text();
			return new Response('Auth failed: ' + msg, {
				headers,
				status: 500,
			});
		}

		const loginData = await loginRes.json();
		const accessToken = loginData.token;
		if (!accessToken) {
			return new Response('Auth failed', {
				headers,
				status: 500,
			});
		}

		// proxy
		const url = new URL(request.url);
		const path = url.pathname.replace('/', '');
		const targetUrl = `https://gooberdash-api.winterpixel.io/v2/rpc/${path}`;

		const allowed_paths = [
			'levels_editor_get',
			'levels_query_curated',
			'time_trial_query_leaderboard',
			'query_player_profile',
		];
		if (!allowed_paths.find((p) => path.startsWith(p))) {
			return new Response('Requested path not allowed', {
				headers,
				status: 500,
			});
		}

		const body = request.method === 'POST' ? await request.text() : null;

		const proxyRes = await fetch(targetUrl, {
			method: request.method,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			...(body && { body: JSON.stringify(body) }),
		});

		const proxyHeaders = new Headers(proxyRes.headers);
		headers.set(
			'Content-Type',
			proxyHeaders.get('Content-Type') || 'application/json',
		);

		let json = await proxyRes.json();
		if (json.payload) {
			try {
				json = JSON.parse(json.payload);
			} catch {
				// ignore
			}
		}
		if (json.data) {
			try {
				json.data = JSON.parse(json.data);
			} catch (e) {
				// ignore
			}
		}

		return new Response(JSON.stringify(json), {
			status: proxyRes.status,
			headers,
		});
	} catch (err) {
		console.error(err);
		return new Response('Internal Server Error', {
			headers,
			status: 500,
		});
	}
}

export default {
	fetch: handleRequest,
};
