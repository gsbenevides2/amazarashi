import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/layout/Header";
import Runtime from "../components/Runtime";
import { serverClientConfig } from "../lib/clientConfig";
import { SITE_URL } from "../lib/site";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Site de referência usa YakuHanRPs (self-hosted, fora do Google Fonts) com fallback "M PLUS 1p".
// Local, só subset latin: o next/font/google injeta ~250 @font-face (fatias CJK) num CSS de 70 KB que bloqueia a renderização.
// Kana/kanji caem no fallback do sistema (--font-sans em globals.css).
const mplus = localFont({
  variable: "--font-mplus",
  src: [
    { path: "./fonts/mplus1p-latin-400.woff2", weight: "400" },
    { path: "./fonts/mplus1p-latin-700.woff2", weight: "700" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "Amazarashi BR", locale: "pt_BR", type: "website", url: "/" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  title: "Amazarashi BR — FanPage",
  description: "FanPage brasileira não oficial do artista Amazarashi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${mplus.variable} h-full antialiased`}>
      <head>
        {/* Config pública lida em runtime (o build não tem env): GA e RUM do browser dependem disto. */}
        <script dangerouslySetInnerHTML={{ __html: `window.__CFG__=${JSON.stringify(serverClientConfig()).replace(/</g, "\\u003c")}` }} />
        {/* Reveal renderiza escondido no servidor; sem JS (ou crawler que não executa) nada o revelaria. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Runtime>
          <Header />
        </Runtime>
        {children}
        {serverClientConfig().ga && (
          <>
            {/* O init é minúsculo e define window.gtag cedo; só o gtag.js pesado (180 KB) espera o load da página. */}
            <Script id="ga-init">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${serverClientConfig().ga}')`}</Script>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${serverClientConfig().ga}`} strategy="lazyOnload" />
          </>
        )}
      </body>
    </html>
  );
}
