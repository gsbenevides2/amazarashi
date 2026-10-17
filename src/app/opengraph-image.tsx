import { getChrome } from "../lib/api";
import { heroImage, ogSize } from "../lib/og";

export const alt = "Amazarashi BR — FanPage";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  const { settings: s } = await getChrome();
  return heroImage({ image: s.hero_image ?? undefined, title: s.hero_title ?? "Amazarashi", subtitle: s.hero_subtitle ?? "Sua FanPage brasileira" });
}
