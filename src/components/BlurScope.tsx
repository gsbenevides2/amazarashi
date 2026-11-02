import { getBlurs } from "../lib/api";
import { BlurProvider } from "./Img";

// ponytail: injeta o mapa inteiro (~centenas de imagens, poucos KB) em cada página; filtrar por página se crescer.
export default async function BlurScope({ children }: { children: React.ReactNode }) {
  return <BlurProvider map={await getBlurs()}>{children}</BlurProvider>;
}
