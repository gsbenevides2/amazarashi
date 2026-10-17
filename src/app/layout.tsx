import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { M_PLUS_1p, Montserrat } from "next/font/google";
import "./globals.css";
import Header from "../components/layout/Header";
import { SITE_URL } from "../lib/site";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Site de referência usa YakuHanRPs (self-hosted, fora do Google Fonts) com fallback "M PLUS 1p".
const mplus = M_PLUS_1p({
  variable: "--font-mplus",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  preload: false, // sem subset japonês no next/font: kana/kanji caem no fallback do sistema
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
        {/* Reveal renderiza escondido no servidor; sem JS (ou crawler que não executa) nada o revelaria. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
