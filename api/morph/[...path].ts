const ALLOWED_PATHS = new Set(['/v1/messages']);

export async function POST(request: Request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace(/^\/api\/morph/, '');

  if (!ALLOWED_PATHS.has(path)) {
    return new Response('Not found', { status: 404 });
  }

  const upstream = await fetch(`https://api.morphllm.com${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: request.headers.get('authorization') ?? '',
      'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
    },
    body: await request.text(),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-cache, no-transform',
    },
  });
}