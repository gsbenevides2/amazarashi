import { SITE_URL } from "../lib/site";

export const abs = (path: string) => `${SITE_URL}${path}`;

// "<" escapado para o JSON não fechar o <script> se o texto vier do admin.
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") }} />;
}

export const artist = { "@type": "MusicGroup", name: "Amazarashi", sameAs: ["https://amazarashi.com"] };

export const itemList = (items: object[]) => ({
  "@type": "ItemList",
  numberOfItems: items.length,
  itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
});

export const collectionPage = (name: string, path: string, items: object[]) => ({ "@type": "CollectionPage", name, url: abs(path), inLanguage: "pt-BR", mainEntity: itemList(items) });

export const breadcrumb = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
});
