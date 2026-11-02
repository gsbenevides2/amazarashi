import { Suspense } from "react";
import { connection } from "next/server";

async function Gate({ children }: { children: React.ReactNode }) {
  // Sem DATABASE_URL (build no Docker/CI) o conteúdo não pode ser prerenderizado: vira buraco renderizado na requisição.
  if (!process.env.DATABASE_URL) await connection();
  return children;
}

export default function Runtime({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
