import type { NextConfig } from "next";

// Imagens enviadas ao S3 (admin) passam pelo next/image: libera só o prefixo público do bucket.
const s3 = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL) : null;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Em dev o S3 pode resolver para IP da rede local, que o Next bloqueia por padrão (SSRF); em produção continua bloqueado.
  // minimumCacheTTL de 1 ano: as capas têm UUID no nome (imutáveis).
  // deviceSizes começa em 384: com qualquer `100vw` no sizes o Next só gera srcset a partir do menor deviceSize (640),
  // e o desktop baixava 640w para slots de 384px.
  images: { deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840], imageSizes: [32, 48, 64, 96, 128, 256], formats: ["image/avif", "image/webp"], qualities: [40, 75], minimumCacheTTL: 31536000, dangerouslyAllowLocalIP: true, remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }, ...(s3 ? [{ protocol: s3.protocol.slice(0, -1) as "http" | "https", hostname: s3.hostname, port: s3.port, pathname: `${s3.pathname.replace(/\/+$/, "")}/**` }] : [])] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
