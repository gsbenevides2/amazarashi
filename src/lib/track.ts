declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Evento do GA4 (no-op sem NEXT_PUBLIC_GA_ID). Marque como "evento-chave" no GA os que são conversão.
export function track(event: string, params: Record<string, string | number | boolean> = {}) {
  if (process.env.NEXT_PUBLIC_GA_ID) window.gtag?.("event", event, params);
}

// Cliques delegados no document, sem tocar em cada componente:
//  - <a>: link externo (Spotify, YouTube, redes) vira `outbound_click`; interno vira `nav_click`; ambos com a seção de origem.
//  - [data-ga="evento"] (+ data-ga-label): botão simples sem estado.
export function trackClicks() {
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const tagged = target?.closest<HTMLElement>("[data-ga]");
    if (tagged) return track(tagged.dataset.ga!, { label: tagged.dataset.gaLabel ?? tagged.getAttribute("aria-label") ?? "" });
    const a = target?.closest("a[href]");
    if (!a) return;
    const url = new URL(a.getAttribute("href")!, location.href);
    const external = url.origin !== location.origin;
    track(external ? "outbound_click" : "nav_click", {
      link_url: external ? url.href : url.pathname + url.hash,
      ...(external && { link_domain: url.hostname }),
      link_text: (a.getAttribute("aria-label") ?? a.textContent ?? "").trim().slice(0, 100),
      section: a.closest("[id]")?.id || a.closest("header,footer,dialog,nav")?.tagName.toLowerCase() || "page",
    });
  });
}
