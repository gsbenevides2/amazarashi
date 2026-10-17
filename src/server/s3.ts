// Bun.S3Client (global: "bun" é builtin, o bundler não resolve o import). Qualquer S3-compatível; S3_PUBLIC_URL é a base pública dos objetos.
let client: Bun.S3Client | null = null;

export async function uploadImage(file: File) {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL) throw new Error("S3 não configurado: veja .env.example");
  client ??= new Bun.S3Client({ endpoint: S3_ENDPOINT || undefined, region: S3_REGION, bucket: S3_BUCKET, accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY });

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `covers/${crypto.randomUUID()}.${ext}`;
  await client.write(key, file, { type: file.type });
  return `${S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
}
