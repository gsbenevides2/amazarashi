import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Footer from "./_components/Footer/Footer";
import Spacer from "./_components/Spacer";

const montserrat = Montserrat({
  variable: "--font-family",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Amazarashi Fan Page",
  description: "Fan Page of Amazarashi Page by Guilherme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body className="antialiased">
        {children}
        <Spacer desktop={80} mobile={40} />
        <Footer
          menuItens={[
            {
              label: "Pagina Oficial",
              href: "https://www.amazarashi.com/",
            },
            {
              label: "Albuns",
              href: "/albuns",
            },
            {
              label: "Musicas",
              href: "/musics",
            },
            {
              label: "Lojinha",
              href: "https://store.plusmember.jp/amazarashi/",
            },
          ]}
          socialNetworks={[
            {
              label: "x.com",
              href: "https://twitter.com/amazarashi_info",
              icon: "X",
            },
            {
              label: "Facebook",
              href: "https://www.facebook.com/amazarashiofficial",
              icon: "Facebook",
            },
            {
              label: "Youtube",
              href: "https://www.youtube.com/user/amazarashiSMEJ",
              icon: "Youtube",
            },
            {
              label: "Instagram",
              href: "https://www.instagram.com/amazarashi_official/",
              icon: "Instagram",
            },
            {
              label: "TikTok",
              href: "https://www.tiktok.com/@amazarashi_official",
              icon: "Tiktok",
            },
            {
              label: "Spotify",
              href: "https://open.spotify.com/intl-pt/artist/6T4K8YuFc0JPDrYgABbxao?si=YJmla-dqSh-a6CX2RZuoAQ",
              icon: "Spotify",
            },
            {
              label: "Apple Music",
              href: "https://music.apple.com/us/artist/amazarashi/342419284",
              icon: "AppleMusic",
            },
            {
              label: "Youtube Music",
              href: "https://music.youtube.com/channel/UCYYblFFBpnZabWlpz9aAIPA",
              icon: "YoutubeMusic",
            },
            {
              href: "https://www.deezer.com/br/artist/8002048",
              label: "Deezer",
              icon: "Deezer",
            },
            {
              label: "Amazon Music",
              href: "https://music.amazon.com.br/artists/B00C87XVX6/amazarashi",
              icon: "AmazonMusic",
            },
          ]}
        />
      </body>
    </html>
  );
}
