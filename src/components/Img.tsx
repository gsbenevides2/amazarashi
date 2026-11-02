"use client";
import Image, { type ImageProps } from "next/image";
import { createContext, useContext } from "react";
import { blurDataURL } from "@/src/lib/blur";

const Blurs = createContext<Record<string, string>>({});
export const BlurProvider = ({ map, children }: { map: Record<string, string>; children: React.ReactNode }) => <Blurs value={map}>{children}</Blurs>;

// next/image com blur por imagem (tabela image_blurs); sem registro cai no cinza genérico.
export default function Img(props: ImageProps & { src: string }) {
  const map = useContext(Blurs);
  return <Image placeholder="blur" blurDataURL={map[props.src] ?? blurDataURL} {...props} />;
}
