import type { Sharp } from "sharp";
import { sharp } from "./native";

// Operações de imagem do parallax sobre buffers crus. Máscaras são 1 canal, 0..255; RGB é w×h×3.
// ATENÇÃO (sharp): `.raw()` de máscara devolve 3 canais (use extractChannel(0)) e `.threshold(n)` depois de `.blur()` ignora o n.

export const mono = (m: Buffer, w: number, h: number) => sharp(m, { raw: { width: w, height: h, channels: 1 } });
export const gray = (img: Sharp) => img.extractChannel(0).raw().toBuffer();
export const invert = (m: Buffer) => Buffer.from(m.map((v) => 255 - v));

// RGB (w×h×3) + alfa (w×h) → RGBA. Monta os bytes à mão: joinChannel mexe com canais de forma imprevisível.
export function withAlpha(rgb: Buffer, alpha: Buffer, w: number, h: number) {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { out[i * 4] = rgb[i * 3]; out[i * 4 + 1] = rgb[i * 3 + 1]; out[i * 4 + 2] = rgb[i * 3 + 2]; out[i * 4 + 3] = alpha[i]; }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

// Dilata uma máscara 0/255: desfoca e liga tudo que passou de `t` (limiar em JS, pelo motivo acima).
export async function dilate(m: Buffer, w: number, h: number, sigma: number, t: number) {
  const b = await gray(mono(m, w, h).blur(sigma));
  for (let i = 0; i < b.length; i++) b[i] = b[i] >= t ? 255 : 0;
  return b;
}
export const erode = async (m: Buffer, w: number, h: number, sigma: number, t: number) => invert(await dilate(invert(m), w, h, sigma, t));

// Maior componente conectado (4-vizinhança) de uma máscara binária, com os buracos preenchidos. Retorna 0/255 ou null se o maior
// componente ocupa menos de `minFrac` ou mais de `maxFrac` da imagem (nada encontrado / engoliu tudo).
export function keepLargestFilled(bin: Buffer, w: number, h: number, minFrac = 0, maxFrac = 1): Buffer | null {
  const n = w * h, label = new Int32Array(n), queue = new Int32Array(n);
  const flood = (start: number, tag: number, ok: (i: number) => boolean) => {
    let head = 0, tail = 0;
    queue[tail++] = start; label[start] = tag;
    while (head < tail) {
      const i = queue[head++], x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !label[j] && ok(j)) { label[j] = tag; queue[tail++] = j; }
    }
    return tail;
  };
  let best = 0, bestSize = 0, tag = 0;
  for (let i = 0; i < n; i++) if (bin[i] > 127 && !label[i]) { const sz = flood(i, ++tag, (j) => bin[j] > 127); if (sz > bestSize) { bestSize = sz; best = tag; } }
  if (!bestSize || bestSize < n * minFrac || bestSize > n * maxFrac) return null;
  const out = Buffer.alloc(n);
  for (let i = 0; i < n; i++) out[i] = label[i] === best ? 255 : 0;
  label.fill(0); // buracos = fundo que as bordas não alcançam
  const bg = ++tag;
  for (let i = 0; i < n; i++) { const x = i % w, y = (i - x) / w; if (!out[i] && !label[i] && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) flood(i, bg, (j) => !out[j]); }
  for (let i = 0; i < n; i++) if (!out[i] && label[i] !== bg) out[i] = 255;
  return out;
}

export const hex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// ---------- candidatos a elemento solto ----------

export type Candidate = {
  id: number;
  cx: number; cy: number; w: number; h: number; // centro e tamanho em 0..1000
  areaPercent: number; fill: number; contrast: number; color: string;
  mask: Buffer; rw: number; rh: number; // máscara grossa (rw×rh) do objeto
};

// Objetos pequenos e nítidos que destoam da vizinhança (caveira, pássaro, lua) sem depender de o modelo de linguagem adivinhar posição:
// distância de cor ao fundo desfocado → limiar → componentes → filtro por tamanho, proporção e preenchimento (texto e linhas não passam).
export async function findCandidates(rgb: Buffer, w: number, h: number, exclude: Buffer | null, sensitivity = 1): Promise<Candidate[]> {
  const rw = Math.min(w, 384), rh = Math.round((rw * h) / w), n = rw * rh;
  const small = await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).resize(rw, rh, { fit: "fill" }).raw().toBuffer();
  const blur = await sharp(small, { raw: { width: rw, height: rh, channels: 3 } }).blur(rw * 0.045).raw().toBuffer();
  let excl = Buffer.alloc(n);
  if (exclude) excl = await dilate(await gray(mono(exclude, w, h).resize(rw, rh, { fit: "fill" })), rw, rh, 3, 8);
  const D = new Float32Array(n);
  let sum = 0, sq = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    D[i] = (Math.abs(small[i * 3] - blur[i * 3]) + Math.abs(small[i * 3 + 1] - blur[i * 3 + 1]) + Math.abs(small[i * 3 + 2] - blur[i * 3 + 2])) / 3;
    if (!excl[i]) { sum += D[i]; sq += D[i] * D[i]; cnt++; }
  }
  const mean = sum / (cnt || 1), std = Math.sqrt(Math.max(0, sq / (cnt || 1) - mean * mean));
  const thr = mean + (1.6 / sensitivity) * std;
  const bin = Buffer.alloc(n);
  for (let i = 0; i < n; i++) bin[i] = !excl[i] && D[i] > thr ? 255 : 0;
  const merged = await dilate(bin, rw, rh, 1.5, 40); // junta fragmentos do mesmo objeto
  // componentes
  const label = new Int32Array(n), queue = new Int32Array(n), found: Candidate[] = [];
  let tag = 0;
  for (let s = 0; s < n; s++) {
    if (!merged[s] || label[s]) continue;
    let head = 0, tail = 0, x0 = rw, y0 = rh, x1 = 0, y1 = 0;
    queue[tail++] = s; label[s] = ++tag;
    while (head < tail) {
      const i = queue[head++], x = i % rw, y = (i - x) / rw;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < rw - 1 ? i + 1 : -1, y > 0 ? i - rw : -1, y < rh - 1 ? i + rw : -1]) if (j >= 0 && !label[j] && merged[j]) { label[j] = tag; queue[tail++] = j; }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, frac = tail / n, fill = tail / (bw * bh), aspect = Math.max(bw, bh) / Math.min(bw, bh);
    if (frac < 0.0006 || frac > 0.04 || aspect > 3.2 || fill < 0.35) continue;
    const comp = Buffer.alloc(n);
    let c = 0, rs = 0, gs = 0, bs = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * rw + x; if (label[i] === tag) { comp[i] = 255; c += D[i]; rs += small[i * 3]; gs += small[i * 3 + 1]; bs += small[i * 3 + 2]; } }
    const filled = keepLargestFilled(comp, rw, rh) ?? comp;
    found.push({ id: 0, cx: Math.round(((x0 + bw / 2) / rw) * 1000), cy: Math.round(((y0 + bh / 2) / rh) * 1000), w: Math.round((bw / rw) * 1000), h: Math.round((bh / rh) * 1000), areaPercent: +(frac * 100).toFixed(2), fill: +fill.toFixed(2), contrast: +(c / tail).toFixed(1), color: hex([rs / tail, gs / tail, bs / tail]), mask: filled, rw, rh });
  }
  found.sort((a, b) => b.contrast * Math.sqrt(b.areaPercent) - a.contrast * Math.sqrt(a.areaPercent));
  return found.slice(0, 10).map((f, i) => ({ ...f, id: i + 1 }));
}

// ---------- refinamento de borda por cor ----------

// Recorta o `alpha` de volta ao objeto: só ficam os pixels que diferem da cor do fundo ao redor (anel). Sobras de fundo dentro de elipses e
// polígonos grosseiros somem; o miolo é preservado (maior componente + buracos preenchidos). `shrink` come px da borda (tira halo).
export async function refineByColor(rgb: Buffer, w: number, h: number, alpha: Buffer, tol: number, shrink: number): Promise<Buffer | null> {
  const ring = await dilate(alpha, w, h, 14, 8);
  const mean = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < w * h; i++) if (ring[i] && alpha[i] < 8) { for (let c = 0; c < 3; c++) mean[c] += rgb[i * 3 + c]; n++; }
  if (!n) return null;
  for (let c = 0; c < 3; c++) mean[c] /= n;
  let dev = 0;
  for (let i = 0; i < w * h; i++) if (ring[i] && alpha[i] < 8) dev += (rgb[i * 3] - mean[0]) ** 2 + (rgb[i * 3 + 1] - mean[1]) ** 2 + (rgb[i * 3 + 2] - mean[2]) ** 2;
  const T = Math.max(12, 2.2 * Math.sqrt(dev / n / 3)) * tol; // fundo com gradiente (desvio alto) pede limiar maior
  const bin = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) bin[i] = alpha[i] > 8 && Math.hypot(rgb[i * 3] - mean[0], rgb[i * 3 + 1] - mean[1], rgb[i * 3 + 2] - mean[2]) > T ? 255 : 0;
  let clean = keepLargestFilled(bin, w, h, 0.00005);
  if (!clean) return null;
  if (shrink > 0) clean = await erode(clean, w, h, shrink * 0.7, 20);
  const soft = await gray(mono(clean, w, h).blur(1.2));
  for (let i = 0; i < soft.length; i++) soft[i] = Math.min(soft[i], alpha[i] > 8 ? 255 : 0);
  return soft;
}
