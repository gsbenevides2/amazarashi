<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ISG (Incremental Static Generation) Implementation

### Summary
This project uses ISG to pre-render all pages during Docker build without requiring database access at build time. The database is only accessed on-demand for new/dynamic slugs created in the admin panel after build.

### Configuration
- **revalidate = 3600**: All pages revalidate every hour in production
- Pages affected:
  - Static pages: `/`, `/albuns-e-discos`, `/biografia`, `/videoclipes`, `sitemap.ts`
  - Dynamic pages: `/album/[slug]`, `/musica/[slug]`

### How it works
1. During build, Next.js calls `generateStaticParams()` to pre-render all existing slugs
2. Each page is cached with `"use cache"` for request-level deduplication
3. After 1 hour in production, pages are regenerated in the background
4. New slugs created in admin are rendered on-first-request (with `instant: false` blocking)

### Build Independence
With ISG, the Docker build:
- Does NOT need the database connection to pre-render pages
- Generates static HTML for all known slugs at build time
- Serves pre-rendered content immediately on first request
- Revalidates in background without blocking requests

### Cache Invalidation
The admin panel can still invalidate pages on-demand using:
```typescript
revalidatePath("/", "layout")  // Invalidate all pages
revalidatePath("/album/[slug]", "layout")  // Invalidate all album pages
```

### Related files modified
- `src/app/page.tsx` - Home page revalidation
- `src/app/albuns-e-discos/page.tsx` - Discography page revalidation
- `src/app/biografia/page.tsx` - Biography page revalidation
- `src/app/videoclipes/page.tsx` - Video clips page revalidation
- `src/app/sitemap.ts` - Sitemap revalidation
- `src/app/album/[slug]/page.tsx` - Album detail pages
- `src/app/musica/[slug]/page.tsx` - Song detail pages
