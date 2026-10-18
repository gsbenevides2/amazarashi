#!/usr/bin/env bun
/**
 * Gera GIF animado e WEBM (10s iniciais) de cada videoclipe e envia ao S3.
 * Uso: bun run scripts/generate-gif-previews.ts [--all | --id <youtubeId>]
 *
 * Requer: yt-dlp, ffmpeg (brew install yt-dlp ffmpeg)
 */

import { eq, isNull } from "drizzle-orm";
import { db } from "../src/server/db";
import { musicVideos } from "../src/server/db/schema";
import { uploadImage } from "../src/server/s3";

const DURATION = 10; // segundos
const FPS = 15;
const WIDTH = 1080; // largura do GIF/WEBM (altura proporcional)

// yt-dlp precisa do deno >=2 no PATH para resolver o JS challenge do YouTube
const PATH = `/opt/homebrew/bin:${process.env.PATH}`;

async function downloadVideo(youtubeId: string, tmpDir: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const videoPath = `${tmpDir}/clip.mp4`;

  console.log(`  ⬇  Baixando ${DURATION}s de ${youtubeId}...`);
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

  console.log(`  🎞  Convertendo para GIF (${WIDTH}px, ${FPS}fps)...`);
  const palettePath = `${tmpDir}/palette.png`;

  // Gerar palette
  const pal = Bun.spawn(
    ["ffmpeg", "-y", "-i", videoPath, "-vf", `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff`, palettePath],
    { stdout: "ignore", stderr: "ignore" },
  );
  if ((await pal.exited) !== 0) throw new Error("ffmpeg palettegen falhou");

  // Gerar GIF com palette
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

async function processVideo(youtubeId: string) {
  console.log(`\n🎬 ${youtubeId}`);
  const tmpDir = `/tmp/gif-preview-${crypto.randomUUID()}`;
  await Bun.spawn(["mkdir", "-p", tmpDir]).exited;

  try {
    const videoPath = await downloadVideo(youtubeId, tmpDir);

    // Gerar GIF
    const gifFile = await generateGif(videoPath, tmpDir);
    console.log(`  ☁  Enviando GIF ao S3 (${(gifFile.size / 1024).toFixed(0)} KB)...`);
    const gifUrl = await uploadImage(gifFile);

    // Gerar WEBM
    const webmFile = await generateWebm(videoPath, tmpDir);
    console.log(`  ☁  Enviando WEBM ao S3 (${(webmFile.size / 1024).toFixed(0)} KB)...`);
    const webmUrl = await uploadImage(webmFile);

    await db.update(musicVideos).set({ gifPreview: gifUrl, webmPreview: webmUrl }).where(eq(musicVideos.youtubeId, youtubeId));
    console.log(`  ✅ GIF: ${gifUrl}`);
    console.log(`  ✅ WEBM: ${webmUrl}`);
  } catch (e) {
    console.error(`  ❌ Erro: ${e instanceof Error ? e.message : e}`);
  } finally {
    await Bun.spawn(["rm", "-rf", tmpDir]).exited;
  }
}

// --- Main ---
const args = process.argv.slice(2);

if (args.includes("--id")) {
  const idx = args.indexOf("--id");
  const id = args[idx + 1];
  if (!id) { console.error("Uso: --id <youtubeId>"); process.exit(1); }
  await processVideo(id);
} else {
  // --all (padrão): todos que não têm gifPreview OU webmPreview
  const all = args.includes("--all");
  const where = all ? undefined : isNull(musicVideos.gifPreview);
  const rows = await db.select({ youtubeId: musicVideos.youtubeId, title: musicVideos.title }).from(musicVideos).where(where);
  if (rows.length === 0) { console.log("Nenhum vídeo para processar."); process.exit(0); }
  console.log(`Processando ${rows.length} vídeo(s)...`);
  for (const r of rows) {
    await processVideo(r.youtubeId);
  }
}

console.log("\n🏁 Concluído.");