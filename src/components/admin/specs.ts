// Descrição dos recursos editáveis; usada pelo formulário (client) e pelo CRUD (server). Os nomes dos campos são as colunas do schema.
export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "image" | "ref";
  options?: string[];
  ref?: string; // recurso referenciado (type "ref")
  required?: boolean;
  virtual?: boolean; // não é coluna: tratado em server/modules/admin/service.ts
  help?: string;
};
export type Spec = { group: string; label: string; titleField: string; fields: Field[] };

const f = (name: string, label: string, type: Field["type"] = "text", extra: Partial<Field> = {}): Field => ({ name, label, type, ...extra });

export const specs: Record<string, Spec> = {
  releases: {
    group: "Catálogo",
    label: "Lançamentos",
    titleField: "title",
    fields: [
      f("title", "Título (japonês)", "text", { required: true }),
      f("slug", "Slug (só se tiver página de detalhe)"),
      f("category", "Categoria", "select", { options: ["single", "album", "dvd", "streaming"], required: true }),
      f("releaseDate", "Data (AAAA-MM-DD)", "text", { required: true }),
      f("romaji", "Romaji"),
      f("nameEn", "Nome em inglês"),
      f("namePt", "Nome em português"),
      f("coverImage", "Capa (upload)", "image"),
      f("spotifyUrl", "Spotify"),
      f("youtubeMusicUrl", "YouTube Music"),
      f("tracks", "Faixas", "textarea", { virtual: true, help: "Uma por linha: título | duração | slug da música (opcional)" }),
    ],
  },
  songs: {
    group: "Catálogo",
    label: "Músicas",
    titleField: "romaji",
    fields: [
      f("slug", "Slug", "text", { required: true }),
      f("releaseId", "Álbum de origem", "ref", { ref: "releases", required: true }),
      f("romaji", "Romaji", "text", { required: true }),
      f("kana", "Kana", "text", { required: true }),
      f("nameEn", "Nome em inglês", "text", { required: true }),
      f("namePt", "Nome em português", "text", { required: true }),
      f("duration", "Duração", "text", { required: true }),
      f("releaseDate", "Data (AAAA-MM-DD)", "text", { required: true }),
      f("youtubeId", "Id do YouTube (só áudio)", "text", { required: true, help: "Vídeo do canal \"amazarashi - Topic\". A letra sincronizada usa este; não coloque o videoclipe aqui." }),
      f("videoclipId", "Id do videoclipe no YouTube", "text", { help: "Opcional: videoclipe oficial da música." }),
      f("spotifyUrl", "Spotify", "text", { required: true }),
      f("youtubeMusicUrl", "YouTube Music", "text", { required: true }),
      f("description", "Descrição", "textarea", { required: true }),
      f("lyrics", "Letra", "textarea", { virtual: true, help: "Uma por linha: segundo | kana | romaji | português. Deixe o segundo vazio para letra sem sincronia." }),
    ],
  },
  "site-settings": {
    group: "Home",
    label: "Textos do site",
    titleField: "key",
    fields: [
      f("key", "Chave", "select", { required: true, options: ["hero_title", "hero_subtitle", "hero_cta", "hero_cta_href", "hero_image", "bio_intro", "footer_tagline", "home_intro", "discography_intro"], help: "Uma linha por chave. hero_* = topo da home (hero_cta = texto do botão, hero_cta_href = para onde ele vai; hero_image usa o campo de imagem); bio_intro = abertura da biografia; footer_tagline = texto sob o logo do rodapé; home_intro = parágrafo de abertura da home (abaixo dos álbuns); discography_intro = parágrafo sob o título de /albuns-e-discos." }),
      f("value", "Texto", "textarea"),
      f("coverImage", "Imagem (upload)", "image", { help: "Só para a chave hero_image." }),
    ],
  },
  "menu-items": {
    group: "Navegação",
    label: "Menu",
    titleField: "label",
    fields: [
      f("label", "Rótulo", "text", { required: true }),
      f("href", "Link", "text", { required: true }),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  "social-links": {
    group: "Navegação",
    label: "Redes sociais",
    titleField: "label",
    fields: [
      f("network", "Rede (define o ícone)", "select", { options: ["x", "youtube", "instagram"], required: true }),
      f("label", "Rótulo", "text", { required: true }),
      f("href", "Link", "text", { required: true }),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  highlights: {
    group: "Home",
    label: "Destaques (home)",
    titleField: "title",
    fields: [
      f("title", "Título", "text", { required: true }),
      f("description", "Descrição", "textarea", { required: true }),
      f("coverImage", "Imagem (upload)", "image"),
      f("imageAlt", "Texto alternativo da imagem", "text", { help: "Descreva a imagem (ex.: Capa de Kanashimi sae Otonabite). Vazio = usa o título." }),
      f("href", "Link", "text", { help: "Opcional: torna o card clicável (ex.: /musica/slug)" }),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  "info-cards": {
    group: "Home",
    label: "Cards de informação (home)",
    titleField: "headline",
    fields: [
      f("headline", "Título", "text", { required: true }),
      f("subhead", "Subtítulo"),
      f("bodyText", "Texto", "textarea"),
      f("coverImage", "Imagem (upload)", "image"),
      f("imageAlt", "Texto alternativo da imagem", "text", { help: "Descreva a imagem (ex.: Capa de Kanashimi sae Otonabite). Vazio = usa o título." }),
      f("layout", "Layout", "select", { options: ["split", "full"], required: true, help: "split = imagem ao lado; full = imagem de fundo" }),
      f("textPosition", "Posição do texto", "select", { options: ["left", "center", "right"], required: true }),
      f("ctaMode", "Botão: estilo", "select", { options: ["button", "link"], help: "Vazio = sem botão" }),
      f("ctaText", "Botão: texto"),
      f("ctaHref", "Botão: link"),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  "music-videos": {
    group: "Catálogo",
    label: "Vídeoclipes",
    titleField: "title",
    fields: [
      f("title", "Título (japonês)", "text", { required: true }),
      f("romaji", "Romaji"),
      f("youtubeId", "Id do vídeo no YouTube", "text", { required: true }),
      f("gradientFrom", "Gradiente (de)", "text", { required: true }),
      f("gradientTo", "Gradiente (até)", "text", { required: true }),
      f("coverImage", "Miniatura (upload)", "image"),
      f("gifPreview", "GIF animado (upload)", "image"),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  "anime-songs": {
    group: "Catálogo",
    label: "Músicas em animes",
    titleField: "song",
    fields: [
      f("song", "Música", "text", { required: true }),
      f("romaji", "Romaji", "text", { required: true }),
      f("anime", "Anime", "text", { required: true }),
      f("role", "Papel (abertura, encerramento…)", "text", { required: true }),
      f("year", "Ano", "number", { required: true }),
      f("coverImage", "Capa (upload)", "image"),
    ],
  },
  "band-members": {
    group: "Biografia",
    label: "Integrantes",
    titleField: "name",
    fields: [
      f("name", "Nome", "text", { required: true }),
      f("role", "Função", "text", { required: true }),
      f("bio", "Bio", "textarea", { required: true }),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  "timeline-events": {
    group: "Biografia",
    label: "Linha do tempo",
    titleField: "yearLabel",
    fields: [
      f("yearLabel", "Ano (ex.: 2022–2025)", "text", { required: true }),
      f("text", "Texto", "textarea", { required: true }),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  "band-stats": {
    group: "Biografia",
    label: "Números da banda",
    titleField: "label",
    fields: [
      f("value", "Valor", "text", { required: true }),
      f("label", "Rótulo", "text", { required: true }),
      f("position", "Posição", "number", { required: true }),
    ],
  },
  sources: {
    group: "Biografia",
    label: "Fontes",
    titleField: "label",
    fields: [f("label", "Rótulo", "text", { required: true }), f("href", "Link", "text", { required: true })],
  },
};
