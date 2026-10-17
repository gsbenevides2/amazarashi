import { NextResponse, type NextRequest } from "next/server";
import { clientId, clientSecret, cookieOpts, endpoints, maxAge, redirectUri, SESSION, sign } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const [state, next] = (req.cookies.get("oauth_state")?.value ?? "").split("|");
  const fail = () => new NextResponse("Falha no login", { status: 400 });
  const code = q.get("code");
  if (!code || !state || q.get("state") !== state) return fail();

  const token = await fetch(endpoints.token, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  });
  if (!token.ok) return fail();
  const { access_token } = await token.json();
  const info = await fetch(endpoints.userinfo, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!info.ok) return fail();
  const user = await info.json();

  const res = NextResponse.redirect(new URL(next, process.env.SITE_URL));
  res.cookies.set(SESSION, await sign({ sub: user.sub, name: user.name, exp: Math.floor(Date.now() / 1000) + maxAge }), { ...cookieOpts, maxAge });
  res.cookies.delete("oauth_state");
  return res;
}
