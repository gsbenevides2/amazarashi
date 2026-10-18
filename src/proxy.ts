import { NextResponse, type NextRequest } from "next/server";
import { SESSION, validBearer, verify } from "./lib/auth";

// Admin (páginas e /api/admin) exige login; o resto do site e da API segue público.
export async function proxy(req: NextRequest) {
  // Só em dev: `ADMIN_AUTH_DISABLED=true` no .env pula o login. Em produção (NODE_ENV=production) é ignorado.
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_AUTH_DISABLED === "true") return NextResponse.next();
  if (await verify(req.cookies.get(SESSION)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (await validBearer(req.headers.get("authorization"))) return NextResponse.next();
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }
  const login = new URL("/oauth/login", process.env.SITE_URL);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
