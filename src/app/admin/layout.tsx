import type { Metadata } from "next";
import { Suspense } from "react";
import AdminNav from "../../components/admin/AdminNav";

export const metadata: Metadata = { title: "Admin — Amazarashi BR", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {/* header do site vem do layout raiz; o admin tem navegação própria */}
      <style>{"[data-site-header]{display:none}"}</style>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 md:grid-cols-[200px_1fr] md:gap-12">
        {/* AdminNav usa usePathname: em rotas dinâmicas ([resource], [id]) o valor só existe em runtime, então vem por streaming */}
        <Suspense>
          <AdminNav />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
