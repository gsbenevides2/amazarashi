// Bun.S3Client (global: "bun" é builtin, o bundler não resolve o import). Qualquer S3-compatível; S3_PUBLIC_URL é a base pública dos objetos.
let client: Bun.S3Client | null = null;

function s3() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL) throw new Error("S3 não configurado: veja .env.example");
  return (client ??= new Bun.S3Client({ endpoint: S3_ENDPOINT || undefined, region: S3_REGION, bucket: S3_BUCKET, accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }));
}

export const publicUrl = (key: string) => `${process.env.S3_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`;

export async function uploadImage(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `covers/${crypto.randomUUID()}.${ext}`;
  await s3().write(key, file, { type: file.type });
  return publicUrl(key);
}

export async function listObjects() {
  const out: { key: string; size: number; modified: Date }[] = [];
  let token: string | undefined;
  do {
    const r = await s3().list({ maxKeys: 1000, continuationToken: token });
    for (const c of r.contents ?? []) out.push({ key: c.key, size: c.size ?? 0, modified: new Date(c.lastModified ?? 0) });
    token = r.isTruncated ? r.nextContinuationToken : undefined;
  } while (token);
  return out;
}

export const deleteObject = (key: string) => s3().delete(key);
