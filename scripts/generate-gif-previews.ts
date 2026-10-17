#!/usr/bin/env bun
/**
 * Gera GIF animado (10s iniciais) de cada videoclipe e envia ao S3.
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
const WIDTH = 1080; // largura do GIF (altura proporcional)

// yt-dlp precisa do deno >=2 no PATH para resolver o JS challenge do YouTube
const PATH = `/opt/homebrew/bin:${process.env.PATH}`;

async function generateGif(youtubeId: string): Promise<File> {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const tmpDir = `/tmp/gif-preview-${crypto.randomUUID()}`;
  await Bun.spawn(["mkdir", "-p", tmpDir]).exited;

  const videoPath = `${tmpDir}/clip.mp4`;
  const gifPath = `${tmpDir}/preview.gif`;

  try {
    // 1. Baixar os primeiros DURATION segundos
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

    // 2. Converter para GIF com palette para melhor qualidade
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

    // 3. Ler o arquivo e converter para File
    const buf = await Bun.file(gifPath).arrayBuffer();
    return new File([buf], `${youtubeId}-preview.gif`, { type: "image/gif" });
  } finally {
    // Limpar arquivos temporários
    await Bun.spawn(["rm", "-rf", tmpDir]).exited;
  }
}

async function processVideo(youtubeId: string) {
  console.log(`\n🎬 ${youtubeId}`);
  try {
    const file = await generateGif(youtubeId);
    console.log(`  ☁  Enviando ao S3 (${(file.size / 1024).toFixed(0)} KB)...`);
    const publicUrl = await uploadImage(file);
    await db.update(musicVideos).set({ gifPreview: publicUrl }).where(eq(musicVideos.youtubeId, youtubeId));
    console.log(`  ✅ ${publicUrl}`);
  } catch (e) {
    console.error(`  ❌ Erro: ${e instanceof Error ? e.message : e}`);
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
  // --all (padrão): todos que não têm gifPreview
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