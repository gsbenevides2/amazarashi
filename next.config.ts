import type { NextConfig } from "next";

// Imagens enviadas ao S3 (admin) passam pelo next/image: libera só o prefixo público do bucket.
const s3 = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL) : null;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Em dev o S3 pode resolver para IP da rede local, que o Next bloqueia por padrão (SSRF); em produção continua bloqueado.
  images: { qualities: [40, 75], dangerouslyAllowLocalIP: true, remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }, ...(s3 ? [{ protocol: s3.protocol.slice(0, -1) as "http" | "https", hostname: s3.hostname, port: s3.port, pathname: `${s3.pathname.replace(/\/+$/, "")}/**` }] : [])] },
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
