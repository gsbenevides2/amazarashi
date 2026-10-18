import { doublePrecision, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

// Derivado de planning/er-diagram.md. Datas em ISO (YYYY-MM-DD).
export const releases = pgTable("releases", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().unique(), // nulo = sem página de detalhe
  category: text({ enum: ["single", "album", "dvd", "streaming"] }).notNull(),
  title: text().notNull(), // título na discografia (japonês)
  romaji: text(),
  nameEn: text(),
  namePt: text(),
  coverImage: text(), // URL da capa enviada ao S3
  releaseDate: text().notNull(),
  spotifyUrl: text(),
  youtubeMusicUrl: text(),
});

export const songs = pgTable("songs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().unique().notNull(),
  releaseId: integer().notNull().references(() => releases.id),
  romaji: text().notNull(),
  kana: text().notNull(),
  nameEn: text().notNull(),
  namePt: text().notNull(),
  duration: text().notNull(),
  releaseDate: text().notNull(),
  youtubeId: text().notNull(), // vídeo só com o áudio (canal "- Topic"); a letra sincronizada usa este
  videoclipId: text(), // videoclipe oficial, quando existe
  spotifyUrl: text().notNull(),
  youtubeMusicUrl: text().notNull(),
  description: text().notNull(),
});

export const tracks = pgTable(
  "tracks",
  {
    releaseId: integer().notNull().references(() => releases.id),
    trackNumber: integer().notNull(),
    title: text().notNull(),
    duration: text().notNull(),
    songId: integer().references(() => songs.id), // nulo = faixa sem página
  },
  (t) => [primaryKey({ columns: [t.releaseId, t.trackNumber] })],
);

export const lyricLines = pgTable(
  "lyric_lines",
  {
    songId: integer().notNull().references(() => songs.id),
    position: integer().notNull(),
    // nulo = letra sem sincronia (o player mostra a lista sem destacar nenhum verso)
    startSecond: doublePrecision(),
    kana: text().notNull(),
    romaji: text().notNull(),
    pt: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.songId, t.position] })],
);

export const musicVideos = pgTable("music_videos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  youtubeId: text().unique().notNull(),
  title: text().notNull(), // japonês
  romaji: text(),
  gradientFrom: text().notNull(),
  gradientTo: text().notNull(),
  coverImage: text(), // miniatura enviada ao S3
  gifPreview: text(), // GIF animado dos 10s iniciais (S3)
  webmPreview: text(), // WEBM dos 10s iniciais (S3)
  position: integer(), // null = não aparece na página /videoclipes
});

// ponytail: sem tabela ANIME (título do anime solto); songId liga à página da música; normalizar se houver edição.
export const animeSongs = pgTable("anime_songs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  song: text().notNull(),
  romaji: text().notNull(),
  anime: text().notNull(),
  role: text().notNull(),
  year: integer().notNull(),
  coverImage: text(), // URL da capa enviada ao S3; nulo = usa a capa do lançamento da música
  songId: integer().references(() => songs.id), // nulo = sem página da música
});

export const bandMembers = pgTable("band_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  role: text().notNull(),
  bio: text().notNull(),
  position: integer().notNull(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  yearLabel: text().notNull(),
  text: text().notNull(),
  position: integer().notNull(),
});

export const bandStats = pgTable("band_stats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  value: text().notNull(),
  label: text().notNull(),
  position: integer().notNull(),
});

export const sources = pgTable("sources", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  label: text().notNull(),
  href: text().notNull(),
});

// Home: lista "Destaques".
export const highlights = pgTable("highlights", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
  description: text().notNull(),
  coverImage: text(), // URL da imagem enviada ao S3
  href: text(), // link do card (opcional)
  imageAlt: text(), // texto alternativo da imagem (SEO/acessibilidade)
  position: integer().notNull(),
});

// Home: blocos de texto + imagem.
export const infoCards = pgTable("info_cards", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  headline: text().notNull(),
  subhead: text(),
  bodyText: text(),
  coverImage: text(), // URL da imagem enviada ao S3
  imageAlt: text(), // texto alternativo da imagem (SEO/acessibilidade)
  layout: text({ enum: ["split", "full"] }).notNull(),
  textPosition: text({ enum: ["left", "center", "right"] }).notNull(),
  ctaMode: text({ enum: ["button", "link"] }),
  ctaText: text(),
  ctaHref: text(),
  position: integer().notNull(),
});

// Textos soltos do site (um por chave; as chaves válidas estão em components/admin/specs.ts).
export const siteSettings = pgTable("site_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  key: text().unique().notNull(),
  value: text(), // texto; a chave hero_image usa coverImage
  coverImage: text(), // URL de imagem enviada ao S3
});

export const menuItems = pgTable("menu_items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  label: text().notNull(),
  href: text().notNull(),
  position: integer().notNull(),
});

// O desenho do ícone fica em components/links.ts, indexado por `network`.
export const socialLinks = pgTable("social_links", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  network: text({ enum: ["x", "youtube", "instagram"] }).notNull(),
  label: text().notNull(),
  href: text().notNull(),
  position: integer().notNull(),
});
