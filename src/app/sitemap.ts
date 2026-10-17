import type { MetadataRoute } from "next";
import { api, unwrap } from "../lib/api";
import { SITE_URL } from "../lib/site";

// Cacheado: o admin invalida com revalidatePath("/", "layout").
// ponytail: lastmod = data de lançamento (não há updatedAt no banco); upgrade: coluna updated_at se quiser lastmod real.
async function entries() {
  "use cache";
  const [releases, songs] = await Promise.all([api.releases.get({ query: {} }).then(unwrap), api.songs.get().then(unwrap)]);
  return {
    albums: releases.flatMap((r) => (r.slug ? [{ slug: r.slug, date: r.releaseDate }] : [])),
    songs: songs.filter((s) => !s.thin).map((s) => ({ slug: s.slug, date: s.releaseDate })), // thin = noindex
    latest: releases.reduce((a, r) => (r.releaseDate > a ? r.releaseDate : a), ""),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { albums, songs, latest } = await entries();
  const at = (d: string) => (d ? new Date(d) : undefined);
  return [
    { path: "", date: latest },
    { path: "/albuns-e-discos", date: latest },
    { path: "/videoclipes", date: "" },
    { path: "/biografia", date: "" },
    ...albums.map((a) => ({ path: `/album/${a.slug}`, date: a.date })),
    ...songs.map((s) => ({ path: `/musica/${s.slug}`, date: s.date })),
  ].map(({ path, date }) => ({ url: `${SITE_URL}${path}`, lastModified: at(date) }));
}
