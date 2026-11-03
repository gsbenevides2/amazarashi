// Localização do visitante a partir dos headers do Cloudflare (Managed Transform "Add visitor location headers").
// Strings vazias são omitidas: campo ausente não polui o esquema do OpenObserve.
// O Node lê header como Latin-1, mas o Cloudflare manda UTF-8 ("São Paulo" chegava "SÃ£o Paulo"): reinterpreta os bytes.
// Se não for UTF-8 válido (U+FFFD), mantém o original.
const dec = (v: string | null) => {
  if (!v) return "";
  let out = v;
  try {
    out = decodeURIComponent(v);
  } catch {}
  const utf8 = Buffer.from(out, "latin1").toString("utf8");
  return utf8.includes("\uFFFD") ? out : utf8;
};

export function geoFromHeaders(h: Headers): Record<string, string> {
  const raw: Record<string, string> = {
    ip: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    country: dec(h.get("cf-ipcountry")),
    region: dec(h.get("cf-region")),
    region_code: dec(h.get("cf-region-code")),
    city: dec(h.get("cf-ipcity")),
    latitude: dec(h.get("cf-iplatitude")),
    longitude: dec(h.get("cf-iplongitude")),
    continent: dec(h.get("cf-ipcontinent")),
    timezone: dec(h.get("cf-timezone")),
    postal_code: dec(h.get("cf-postal-code")),
  };
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => v));
}
