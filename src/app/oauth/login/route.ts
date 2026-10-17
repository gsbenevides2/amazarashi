import { NextResponse, type NextRequest } from "next/server";
import { clientId, cookieOpts, endpoints, redirectUri } from "../../../lib/auth";

export function GET(req: NextRequest) {
  const state = crypto.randomUUID();
  const next = req.nextUrl.searchParams.get("next") ?? "/admin";
  const url = new URL(endpoints.authorize);
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, scope: "openid profile email", state }).toString();
  const res = NextResponse.redirect(url);
  // next só vale se for caminho interno (evita open redirect).
  res.cookies.set("oauth_state", `${state}|${next.startsWith("/") && !next.startsWith("//") ? next : "/admin"}`, { ...cookieOpts, maxAge: 600 });
  return res;
}
