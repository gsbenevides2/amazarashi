// Localização do visitante a partir dos headers do Cloudflare (Managed Transform "Add visitor location headers").
// Strings vazias são omitidas: campo ausente não polui o esquema do OpenObserve.
const dec = (v: string | null) => {
  if (!v) return "";
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
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
