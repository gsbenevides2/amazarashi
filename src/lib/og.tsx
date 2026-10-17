import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getChrome } from "./api";

export const ogSize = { width: 1200, height: 630 };
const RED = "#dc2626";

const hex = (h: number, s: number, l: number) => {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

// Cor de destaque da imagem: média dos pixels ponderada pela saturação (ignora fundo branco/preto),
// com luminosidade travada para aparecer bem sobre o fundo escuro. `deep` e `dark` são variações para degradês.
async function palette(url: string) {
  "use cache";
  const fallback = { accent: RED, deep: "#7f1d1d", dark: "#140000" };
  try {
    const { data } = await sharp(Buffer.from(await (await fetch(url)).arrayBuffer())).resize(32, 32, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < data.length; i += 3) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const sat = (max - Math.min(data[i], data[i + 1], data[i + 2])) / 255;
      const wt = sat * sat + 0.005;
      r += data[i] * wt; g += data[i + 1] * wt; b += data[i + 2] * wt; w += wt;
    }
    [r, g, b] = [r / w / 255, g / w / 255, b / w / 255];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    const h = d === 0 ? 0 : 60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
    const sat = d === 0 ? 0 : Math.min(1, Math.max(0.55, d / (1 - Math.abs(2 * l - 1))));
    return { accent: hex(h, sat, 0.5), deep: hex(h, sat * 0.8, 0.22), dark: hex(h, sat * 0.6, 0.05) };
  } catch {
    return fallback;
  }
}

// Subset da fonte (só os glifos usados) via Google Fonts; sem User-Agent o CSS vem com TTF, que o satori aceita.
async function googleFont(family: string, text: string) {
  "use cache";
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@700&text=${encodeURIComponent(text)}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  return url ? new Uint8Array(await (await fetch(url)).arrayBuffer()) : null;
}

// Montserrat para o latim (igual ao site), Noto Sans JP para kana/kanji (o satori não tem CJK embutido).
async function fonts(text: string) {
  const [latin, jp] = await Promise.all([googleFont("Montserrat", text), googleFont("Noto+Sans+JP", text)]);
  return [latin && { name: "Montserrat", data: latin.buffer as ArrayBuffer, weight: 700 as const }, jp && { name: "Noto Sans JP", data: jp.buffer as ArrayBuffer, weight: 700 as const }].filter((f) => !!f);
}

const family = "Montserrat, 'Noto Sans JP'";
const fit = (t: string, big: number, small: number, limit: number) => (t.length > limit ? small : big);

/** Home: hero em tela cheia, degradê escuro à esquerda e o título ao lado. */
export async function heroImage({ image, title, subtitle }: { image?: string; title: string; subtitle: string }) {
  const c = await palette(image ?? "");
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: `linear-gradient(135deg, ${c.deep}, ${c.accent})`, fontFamily: family, color: "white", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        {image && <img src={image} width={800} height={630} style={{ position: "absolute", left: 400, top: 0, objectFit: "cover" }} />}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1200, height: 630, background: `linear-gradient(90deg, ${c.dark} 0%, ${c.dark} 28%, ${c.dark}99 50%, ${c.dark}00 75%)` }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, letterSpacing: 4, color: "white" }}>
            <div style={{ display: "flex", width: 56, height: 6, background: c.accent }} />
            FANPAGE NÃO OFICIAL
          </div>
          <div style={{ display: "flex", fontSize: fit(title, 112, 80, 10), lineHeight: 1.05, marginTop: 24 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 12, opacity: 0.85 }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: await fonts(`${title}${subtitle}FANPAGE NÃO OFICIAL`) },
  );
}

/** Álbum/música: capa inclinada sobre a própria capa escurecida; nome (romaji + kana) ao lado. */
export async function coverImage({ cover, eyebrow, title, kana, footer }: { cover: string; eyebrow: string; title: string; kana?: string | null; footer: string }) {
  const c = await palette(cover);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#111", fontFamily: family, color: "white", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        {cover && <img src={cover} width={1200} height={1200} style={{ position: "absolute", left: 0, top: -285, objectFit: "cover" }} />}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1200, height: 630, background: `linear-gradient(100deg, ${c.dark}ee 0%, ${c.dark}c7 55%, ${c.deep}d9 100%)` }} />
        <div style={{ display: "flex", alignItems: "center", padding: "0 80px", gap: 64, position: "relative", width: "100%" }}>
          <div style={{ display: "flex", position: "relative", width: 420, height: 420, flexShrink: 0 }}>
            <div style={{ display: "flex", position: "absolute", left: 22, top: 22, width: 420, height: 420, background: c.accent, transform: "rotate(-3deg)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            {cover && <img src={cover} width={420} height={420} style={{ position: "absolute", left: 0, top: 0, objectFit: "cover", transform: "rotate(-3deg)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 3, color: c.accent }}>{eyebrow}</div>
            <div style={{ display: "flex", fontSize: fit(title, 72, 48, 22), lineHeight: 1.1, marginTop: 20 }}>{title}</div>
            {kana && <div style={{ display: "flex", fontSize: 34, marginTop: 16, opacity: 0.75 }}>{kana}</div>}
            <div style={{ display: "flex", fontSize: 24, marginTop: 40, opacity: 0.7 }}>{footer}</div>
          </div>
        </div>
        <div style={{ display: "flex", position: "absolute", right: 56, bottom: 36, fontSize: 24, letterSpacing: 2, opacity: 0.9 }}>AMAZARASHI BR</div>
      </div>
    ),
    { ...ogSize, fonts: await fonts(`${eyebrow}${title}${kana ?? ""}${footer}AMAZARASHI BR`) },
  );
}

/** Páginas de listagem/texto: mesmo layout do hero, com o nome da página no lugar do título. */
export async function pageImage(title: string, subtitle: string) {
  const { settings } = await getChrome();
  return heroImage({ image: settings.hero_image ?? undefined, title, subtitle });
}
