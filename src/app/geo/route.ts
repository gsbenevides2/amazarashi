// País do visitante via header do Cloudflare. Só o código do país (sem IP); alimenta o contexto do RUM.
export async function GET(request: Request) {
  return Response.json({ country: request.headers.get("cf-ipcountry") ?? "" }, { headers: { "cache-control": "no-store" } });
}
