export const runtime = 'nodejs';

export async function POST(request) {
  const modelApiUrl = process.env.MODEL_API_URL;

  if (!modelApiUrl) {
    return Response.json(
      { error: 'MODEL_API_URL is not configured.' },
      { status: 503 },
    );
  }

  try {
    const upstreamResponse = await fetch(`${modelApiUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      body: await request.formData(),
    });
    const body = await upstreamResponse.text();

    return new Response(body, {
      status: upstreamResponse.status,
      headers: { 'content-type': upstreamResponse.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return Response.json(
      { error: 'The model service could not be reached.' },
      { status: 502 },
    );
  }
}