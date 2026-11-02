<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Docker Build Independence

### Summary
This project is configured to build independently of the database using `export const dynamic = "force-dynamic"`. This prevents pages from being pre-rendered during the build process, allowing Docker builds to complete without requiring DATABASE_URL.

### Configuration
- **dynamic = "force-dynamic"**: Pages render on-demand at runtime
- Pages affected:
  - `src/app/page.tsx` - Home page
  - `src/app/albuns-e-discos/page.tsx` - Discography
  - `src/app/biografia/page.tsx` - Biography
  - `src/app/videoclipes/page.tsx` - Video clips
  - `src/app/sitemap.ts` - Sitemap
  - `src/app/album/[slug]/page.tsx` - Album details
  - `src/app/musica/[slug]/page.tsx` - Song details

### How it works
1. Build runs `npm run build` without requiring DATABASE_URL
2. Pages with `dynamic = "force-dynamic"` skip pre-rendering
3. At runtime: Pages fetch data on-first-request via `"use cache"` and server components
4. `"use cache"` deduplicates requests within the same render pass (request-level caching)

### Build Process
The Docker build:
- Does NOT require the database connection
- Completes successfully without DATABASE_URL
- Produces a standalone production-ready bundle
- Pages render dynamically at runtime with `"use cache"` optimization

### Continuous Deployment
- GitHub Actions workflow triggers on `package.json` changes
- Builds Docker image with version tagging (major.minor.patch)
- Publishes to GHCR (GitHub Container Registry)
- See `.github/workflows/release.yml` for details

### Related files
- `src/app/page.tsx` - Home page with force-dynamic
- `src/app/albuns-e-discos/page.tsx` - Discography with force-dynamic
- `src/app/biografia/page.tsx` - Biography with force-dynamic
- `src/app/videoclipes/page.tsx` - Video clips with force-dynamic
- `src/app/sitemap.ts` - Sitemap with force-dynamic
- `src/app/album/[slug]/page.tsx` - Album details with force-dynamic
- `src/app/musica/[slug]/page.tsx` - Song details with force-dynamic
- `.github/workflows/release.yml` - CI/CD deployment workflow
- `.github/workflows/release/docker.sh` - Docker build and publish script
