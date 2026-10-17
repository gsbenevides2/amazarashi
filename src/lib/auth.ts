// Login único via Authentik (OIDC, authorization code). Só autenticação: quem logou, entra em tudo.
// Sessão = cookie assinado com HMAC (stateless), sem banco.
const issuer = process.env.AUTHENTIK_ISSUER!; // https://sso.../application/o/<slug>/
const origin = new URL(issuer).origin;
export const endpoints = {
  authorize: `${origin}/application/o/authorize/`,
  token: `${origin}/application/o/token/`,
  userinfo: `${origin}/application/o/userinfo/`,
};
export const endSession = `${issuer}end-session/`;
export const clientId = process.env.AUTHENTIK_CLIENT_ID!;
export const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET!;
export const redirectUri = `${process.env.SITE_URL}/oauth/callback`;
export const SESSION = "session";
export const maxAge = 60 * 60 * 24 * 7;
export const cookieOpts = { httpOnly: true, sameSite: "lax", secure: redirectUri.startsWith("https:"), path: "/" } as const;

const enc = new TextEncoder();
const key = () => crypto.subtle.importKey("raw", enc.encode(process.env.SESSION_SECRET!), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
const b64 = (b: ArrayBuffer) => Buffer.from(b).toString("base64url");

export async function sign(data: object) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${b64(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)))}`;
}

export async function verify<T>(token?: string): Promise<T | null> {
  const [body, sig] = token?.split(".") ?? [];
  if (!body || !sig) return null;
  if (!(await crypto.subtle.verify("HMAC", await key(), Buffer.from(sig, "base64url"), enc.encode(body)))) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString());
  return data.exp > Date.now() / 1000 ? data : null;
}

// Scripts/curl: access token do Authentik (ex.: client_credentials), validado no userinfo.
export async function validBearer(header: string | null) {
  if (!header?.startsWith("Bearer ")) return false;
  return (await fetch(endpoints.userinfo, { headers: { Authorization: header } })).ok;
}
