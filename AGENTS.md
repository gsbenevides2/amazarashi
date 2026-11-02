<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Build sem banco e ISG

### Resumo
O build (local, CI e Docker) **não precisa de banco**: nenhuma página consulta `DATABASE_URL` durante o `next build`. As páginas são geradas no primeiro acesso (ISG) e ficam em cache (`x-nextjs-cache: MISS` -> `HIT`, `Cache-Control: s-maxage=900, stale-while-revalidate`). Slug inexistente responde **404 real**.

O projeto usa `cacheComponents: true`. **Não use `export const dynamic = "force-dynamic"`**: é incompatível com `cacheComponents`.

### Como funciona
- **Páginas de detalhe** (`src/app/album/[slug]`, `src/app/musica/[slug]`): `generateStaticParams` retorna só um placeholder (`__placeholder__`, vira 404 sem consultar nada). Os demais slugs nascem no 1º acesso. `params` é lido **fora de `<Suspense>`**; dentro dele o Next serviria o shell com status 200 (soft-404) em vez de criar a entrada ISR da URL.
- **Páginas fixas** (`/`, `/albuns-e-discos`, `/biografia`, `/videoclipes`): o Next só gera em runtime rotas com parâmetro dinâmico. O conteúdo fica em `src/views/*` e é servido por `src/app/isg/[page]/page.tsx`. Rewrites em `next.config.ts` mantêm as URLs originais e `src/proxy.ts` responde 404 para `/isg/*` direto. Metadata (título, canonical, `og:image`) é definida em `isg/[page]/page.tsx`. Página fixa nova = nova entrada em `pages` nesse arquivo + rewrite em `next.config.ts`.
- **`src/components/Runtime.tsx`**: `<Suspense>` + `connection()` quando não há `DATABASE_URL`, usado no `Header` (layout) e no `not-found.tsx`. Com banco no build, voltam a ser estáticos.
- **Route handlers / imagens OG / sitemap** (`opengraph-image.tsx`, `src/lib/og.tsx`, `sitemap.ts`): chamam `await connection()` para só rodar em requisição. Não declare `generateStaticParams` consultando o banco.
- **`src/server/db/index.ts`**: sem `DATABASE_URL` usa uma URL provisória só para o módulo carregar (o Bun.SQL conecta sob demanda).
- **`"use cache"` e binários**: o cache corrompe `Uint8Array` ao ler (imagens OG quebravam na 2ª chamada). Cacheie string (base64) e decodifique fora do cache, como `googleFont` em `src/lib/og.tsx`.

### Dockerfile
- O build define placeholders de `SITE_URL` e `AUTHENTIK_ISSUER` (módulos que parseiam URL na carga); os valores reais vêm em runtime.
- A imagem final precisa de `.next`, `next.config.ts` (sem ele o runtime perde `cacheComponents` e as páginas dão 500 `DYNAMIC_SERVER_USAGE`) e `public/`.
- `.dockerignore` evita levar `node_modules`, `.next` e `.env` do host para a imagem.

### Verificar após mexer em rotas/cache
```
docker build -t amz-test . && docker run -d --env-file .env -p 3100:3000 amz-test
curl -sD- -o /dev/null localhost:3100/biografia | grep -iE "^HTTP|x-nextjs-cache|cache-control"   # 2x: MISS depois HIT
curl -sI localhost:3100/album/nao-existe | head -1                                            # 404
```

### Continuous Deployment
- GitHub Actions workflow dispara em mudanças no `package.json`
- Builda a imagem Docker com tag de versão (major.minor.patch) e publica no GHCR
- Veja `.github/workflows/release.yml` e `.github/workflows/release/docker.sh`
