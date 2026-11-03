import { geoFromHeaders } from "../../lib/geo";

// Localização e IP do visitante via headers do Cloudflare; o front põe isto no contexto de todo evento do RUM.
export async function GET(request: Request) {
  return Response.json(geoFromHeaders(request.headers), { headers: { "cache-control": "no-store" } });
}
