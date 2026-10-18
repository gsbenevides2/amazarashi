#!/usr/bin/env bun
/**
 * Adiciona vídeos faltantes à tabela music_videos e gera GIFs e WEBMs.
 * Classifica: MVs recebem position (aparecem em /videoclipes), outros sem position.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../src/server/db";
import { musicVideos } from "../src/server/db/schema";
import { uploadImage } from "../src/server/s3";

// yt-dlp precisa do deno >=2 no PATH para resolver o JS challenge do YouTube
const PATH = `/opt/homebrew/bin:${process.env.PATH}`;
const DURATION = 10;
const FPS = 15;
const WIDTH = 1080;

const GRADIENTS = [
  { from: "#7f1d1d", to: "#dc2626" },
  { from: "#1e3a5f", to: "#3b82f6" },
  { from: "#14532d", to: "#22c55e" },
  { from: "#4c1d95", to: "#a78bfa" },
  { from: "#78350f", to: "#f59e0b" },
  { from: "#164e63", to: "#22d3ee" },
  { from: "#44403c", to: "#d6d3d1" },
];

type VideoEntry = {
  youtubeId: string;
  title: string;
  romaji: string;
  isMV: boolean;
};

const VIDEOS: VideoEntry[] = [
  // MVs (aparecem em /videoclipes)
  { youtubeId: "TSncomnvyfc", title: "リビングデッド", romaji: "Ribingu Deddo", isMV: true },
  { youtubeId: "Bg_UIwjYnMQ", title: "フィロソフィー", romaji: "Firosofī", isMV: true },
  { youtubeId: "EG8TUKnBIcQ", title: "多数決", romaji: "Tasūketsu", isMV: true },
  { youtubeId: "HEf7p_7MjkM", title: "命にふさわしい", romaji: "Inochi ni Fusawashii", isMV: true },
  { youtubeId: "QuJBdDS3dOM", title: "たられば", romaji: "Tarareba", isMV: true },
  { youtubeId: "qh8k1veqABs", title: "虚無病", romaji: "Kyomubyō", isMV: true },
  { youtubeId: "bgal_zCI1VQ", title: "ヒーロー", romaji: "Hīrō", isMV: true },
  { youtubeId: "Vaq2LOeFFW0", title: "つじつま合わせに生まれた僕等", romaji: "Tsujitsuma Awase ni Umareta Bokura", isMV: true },
  { youtubeId: "pHGnrG_PrCU", title: "エンディングテーマ", romaji: "Endingu Tēma", isMV: true },

  // Não-MVs (só GIF na página da música)
  { youtubeId: "BVsEcQo7In4", title: "帰ってこいよ", romaji: "Kaette Koiyo", isMV: false },
  { youtubeId: "NpRnJ4oTkfU", title: "ゴースト", romaji: "Gōsuto", isMV: false },
  { youtubeId: "0LnPORR7aHY", title: "おんなじ髑髏", romaji: "Onnaji Dokuro", isMV: false },
  { youtubeId: "efOw9v7QP6c", title: "小市民イーア", romaji: "Shōshimin Īa", isMV: false },
  { youtubeId: "6caAJ6xQqwE", title: "収容室", romaji: "Shūyōshitsu", isMV: false },
  { youtubeId: "u4gwxEk0DRc", title: "アオモリオルタナティブ", romaji: "Aomori Orutanatibu", isMV: false },
  { youtubeId: "xFJfDigOo0g", title: "なまえ", romaji: "Namae", isMV: false },
  { youtubeId: "6H58NNUKmk0", title: "穴を掘っている", romaji: "Ana o Hotte Iru", isMV: false },
  { youtubeId: "pdwTV7Fhc8c", title: "古いSF映画", romaji: "Furui SF Eiga", isMV: false },
  { youtubeId: "YPDmvc1RYdc", title: "夏を待っていました", romaji: "Natsu o Matte Imashita", isMV: false },
  { youtubeId: "eb_lznby0bk", title: "クリスマス", romaji: "Kurisumasu", isMV: false },
  { youtubeId: "uWkoU--KFtQ", title: "ナモナキヒト", romaji: "Namonaki Hito", isMV: false },
  { youtubeId: "0RGTxwV--C8", title: "ラブソング", romaji: "Rabu Songu", isMV: false },
  { youtubeId: "IzMZCCddyf0", title: "ジュブナイル", romaji: "Jubunairu", isMV: false },
  { youtubeId: "xkWr-kECEKg", title: "空っぽの空に潰される", romaji: "Karappo no Sora ni Tsubusareru", isMV: false },
  { youtubeId: "ap2sg77LekI", title: "もう一度", romaji: "Mō Ichido", isMV: false },
  { youtubeId: "ja3UA2lagAM", title: "性善説", romaji: "Seizensetsu", isMV: false },
  { youtubeId: "dQ5Vs4dHmWw", title: "スターライト", romaji: "Sutāraito", isMV: false },
  { youtubeId: "gxu4bHKbHII", title: "あんたへ", romaji: "Anta e", isMV: false },
  { youtubeId: "Fv7ldgocZRs", title: "自虐家のアリー", romaji: "Jigyakuka no Arii", isMV: false },
  { youtubeId: "LPrB_GVIYD4", title: "この街で生きている", romaji: "Kono Machi de Ikite Iru", isMV: false },
  { youtubeId: "B2HsdgVQ-cc", title: "穴を掘っている", romaji: "Ana o Hotte Iru", isMV: false },
];

async function downloadThumbnail(youtubeId: string): Promise<string | null> {
  const tmpPath = `/tmp/thumb-${youtubeId}.jpg`;

  // Tentar maxresdefault, fallback para hqdefault
  for (const quality of ["maxresdefault", "hqdefault"]) {
    const url = `https://i.ytimg.com/vi/${youtubeId}/${quality}.jpg`;
    const dl = Bun.spawn(["curl", "-sL", "-o", tmpPath, "-w", "%{http_code}", url], { stdout: "pipe", stderr: "ignore" });
    const exit = await dl.exited;
    const status = await new Response(dl.stdout).text();
    if (exit === 0 && status.trim() === "200") {
      const buf = await Bun.file(tmpPath).arrayBuffer();
      const f = new File([buf], `${youtubeId}.jpg`, { type: "image/jpeg" });
      const publicUrl = await uploadImage(f);
      await Bun.spawn(["rm", "-f", tmpPath]).exited;
      return publicUrl;
    }
  }
  return null;
}

async function downloadVideo(youtubeId: string, tmpDir: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const videoPath = `${tmpDir}/clip.mp4`;

  console.log(`  ⬇ Baixando ${DURATION}s de ${youtubeId}...`);
  const dl = Bun.spawn(
    ["yt-dlp", "--cookies-from-browser", "chrome", "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best", "--merge-output-format", "mp4", "--download-sections", `*0-${DURATION}`, "-o", videoPath, url],
    { stdout: "ignore", stderr: "pipe", env: { ...process.env, PATH } },
  );
  const dlExit = await dl.exited;
  if (dlExit !== 0) {
    const stderr = await new Response(dl.stderr).text();
    throw new Error(`yt-dlp falhou (exit ${dlExit}): ${stderr.slice(-300)}`);
  }

  return videoPath;
}

async function generateGif(videoPath: string, tmpDir: string): Promise<File> {
  const gifPath = `${tmpDir}/preview.gif`;

  console.log(`  🎞 Convertendo para GIF (${WIDTH}px, ${FPS}fps)...`);
  const palettePath = `${tmpDir}/palette.png`;

  const pal = Bun.spawn(
    ["ffmpeg", "-y", "-i", videoPath, "-vf", `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff`, palettePath],
    { stdout: "ignore", stderr: "ignore" },
  );
  if ((await pal.exited) !== 0) throw new Error("ffmpeg palettegen falhou");

  const gif = Bun.spawn(
    ["ffmpeg", "-y", "-i", videoPath, "-i", palettePath, "-lavfi", `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=2`, gifPath],
    { stdout: "ignore", stderr: "ignore" },
  );
  if ((await gif.exited) !== 0) throw new Error("ffmpeg gif conversion falhou");

  const buf = await Bun.file(gifPath).arrayBuffer();
  return new File([buf], `preview.gif`, { type: "image/gif" });
}

async function generateWebm(videoPath: string, tmpDir: string): Promise<File> {
  const webmPath = `${tmpDir}/preview.webm`;

  console.log(`  🎬 Convertendo para WEBM (${WIDTH}px, ${FPS}fps, sem áudio)...`);
  const webm = Bun.spawn(
    ["ffmpeg", "-y", "-i", videoPath, "-vf", `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos`, "-c:v", "libvpx-vp9", "-b:v", "2M", "-an", webmPath],
    { stdout: "ignore", stderr: "ignore" },
  );
  if ((await webm.exited) !== 0) throw new Error("ffmpeg webm conversion falhou");

  const buf = await Bun.file(webmPath).arrayBuffer();
  return new File([buf], `preview.webm`, { type: "video/webm" });
}

// --- Main ---
const existingRows = await db.select({ youtubeId: musicVideos.youtubeId }).from(musicVideos);
const existingIds = new Set(existingRows.map(r => r.youtubeId));

// Descobrir position máximo atual
const maxPosResult = await db.select({ max: sql`coalesce(max(${musicVideos.position}), 0)` }).from(musicVideos);
let nextPosition = (maxPosResult[0]?.max as number ?? 0) + 1;

console.log(`Position atual: ${nextPosition - 1}`);
console.log(`Vídeos existentes: ${existingIds.size}`);

let gradientIdx = 0;

for (const v of VIDEOS) {
  if (existingIds.has(v.youtubeId)) {
    console.log(`\n⏭ ${v.title} (${v.youtubeId}) já existe, pulando...`);
    continue;
  }

  console.log(`\n🎬 ${v.title} (${v.youtubeId}) - ${v.isMV ? "MV" : "Não-MV"}`);
  const tmpDir = `/tmp/gif-preview-${crypto.randomUUID()}`;
  await Bun.spawn(["mkdir", "-p", tmpDir]).exited;

  try {
    // 1. Thumbnail
    console.log(`  📷 Baixando thumbnail...`);
    const coverImage = await downloadThumbnail(v.youtubeId);
    if (!coverImage) console.log(`  ⚠ Thumbnail não encontrada, usando null`);

    // 2. Baixar vídeo
    const videoPath = await downloadVideo(v.youtubeId, tmpDir);

    // 3. GIF
    const gifFile = await generateGif(videoPath, tmpDir);
    console.log(`  ☁ Enviando GIF ao S3 (${(gifFile.size / 1024).toFixed(0)} KB)...`);
    const gifUrl = await uploadImage(gifFile);

    // 4. WEBM
    const webmFile = await generateWebm(videoPath, tmpDir);
    console.log(`  ☁ Enviando WEBM ao S3 (${(webmFile.size / 1024).toFixed(0)} KB)...`);
    const webmUrl = await uploadImage(webmFile);

    // 5. Gradient
    const gradient = GRADIENTS[gradientIdx % GRADIENTS.length];
    gradientIdx++;

    // 6. Insert
    const position = v.isMV ? nextPosition++ : null;
    await db.insert(musicVideos).values({
      youtubeId: v.youtubeId,
      title: v.title,
      romaji: v.romaji,
      gradientFrom: gradient.from,
      gradientTo: gradient.to,
      position,
      coverImage,
      gifPreview: gifUrl,
      webmPreview: webmUrl,
    });

    console.log(`  ✅ Adicionado! position=${position ?? "null"}, gif=${gifUrl}, webm=${webmUrl}`);
  } catch (e) {
    console.error(`  ❌ Erro: ${e instanceof Error ? e.message : e}`);
  } finally {
    await Bun.spawn(["rm", "-rf", tmpDir]).exited;
  }
}

console.log("\n🏁 Concluído.");
process.exit(0);