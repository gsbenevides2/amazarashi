import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ErrorScreen from "../components/layout/ErrorScreen";
import { outlineButton } from "../components/links";

export const metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <ErrorScreen header={<Header />} footer={<Footer />} code="404" title="Você cruzou a linha" text="Do outro lado da 境界線 (Kyōkaisen), a fronteira, não há nada por aqui. Essa página foi levada pela chuva: o endereço pode estar errado ou o conteúdo não existe mais.">
      <Link href="/" className={outlineButton}>VOLTAR PARA O INÍCIO</Link>
      <Link href="/albuns-e-discos" className={outlineButton}>VER DISCOGRAFIA</Link>
    </ErrorScreen>
  );
}
