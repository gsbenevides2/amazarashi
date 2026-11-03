import { trace } from "@opentelemetry/api";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION, validBearer, verify } from "./lib/auth";
import { geoFromHeaders } from "./lib/geo";

const BOT = /bot|crawl|spider|slurp|preview|headless|facebookexternalhit|curl|wget|python|go-http|axios|node-fetch|scrapy|okhttp|java\//i;

// Origem no span do request: IP, localização (Cloudflare), referrer e humano x bot. Sem isto os traces do servidor
// não dizem quem pediu. O IP também vai ao RUM (contexto), por decisão do dono do site.
function tagRequest(req: NextRequest) {
  const span = trace.getActiveSpan();
  if (!span) return;
  const ua = req.headers.get("user-agent") ?? "";
  const { ip = "", ...geo } = geoFromHeaders(req.headers);
  span.setAttributes({
    "client.address": ip,
    ...Object.fromEntries(Object.entries(geo).map(([k, v]) => [`geo.${k}`, v])),
    "cf.ipcountry": geo.country ?? "", // mantido: já usado em consultas e alertas
    "client.kind": !ua || BOT.test(ua) ? "bot" : "human",
    "http.referrer": req.headers.get("referer") ?? "",
  });
}

const isAdmin = (path: string) => path.startsWith("/admin") || path.startsWith("/api/admin");

// Admin (páginas e /api/admin) exige login; o resto do site e da API segue público.
export async function proxy(req: NextRequest) {
  tagRequest(req);
  if (req.nextUrl.pathname.startsWith("/isg")) return new NextResponse(null, { status: 404 }); // rota interna das páginas ISG
  if (!isAdmin(req.nextUrl.pathname)) return NextResponse.next();
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

// Todas as rotas de página/API (não estáticos): o proxy também marca a origem no span.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|js|css|map|txt|xml)$).*)"] };
