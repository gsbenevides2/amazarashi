import { NextResponse } from "next/server";
import { endSession, SESSION } from "../../../lib/auth";

// Apaga a sessão local e encerra a do Authentik (senão o próximo login entra sem pedir senha).
export function GET() {
  const url = new URL(endSession);
  url.searchParams.set("post_logout_redirect_uri", process.env.SITE_URL!);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION);
  return res;
}
