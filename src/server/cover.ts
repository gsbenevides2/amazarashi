// Capa enviada ao S3; vazia enquanto não houver upload.
export const cover = (r: { coverImage: string | null }) => r.coverImage ?? "";
