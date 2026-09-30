export async function POST(request: Request) {
  const { pathname, search } = new URL(request.url);
  const path = pathname.replace(/^\/api\/morph/, '');

  const upstream = await fetch(`https://api.morphllm.com${path}${search}`, {
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
    },
  });
}