// Configuração do parallax de uma capa (JSON em cover_parallax.config). Coordenadas relativas à capa (0 a 1), como no scope/readme.md.
export type ParallaxLayer = {
  name: string;
  src: string; // webp com transparência, recortado na caixa x/y/w/h
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number; // quanto a camada se move: 0 = parada, 1 = máximo
  float?: boolean; // flutua e gira devagar (elementos soltos)
};
export type ParallaxGlow = { x: number; y: number; w: number; h: number; color: string; period: number };
// Cena: o movimento é escolhido por capa (padrões: amplitude 0.02, drift "eight", vinheta 0.55, sem partículas).
export type ParallaxScene = {
  amplitude: number; // fração da largura que a camada mais próxima anda
  drift: "eight" | "circle" | "horizontal" | "still"; // trajetória da câmera sem mouse (loop de 20 s)
  vignette: number; // 0..1
  particles?: { count: number; color: string; opacity: number };
};
export type ParallaxConfig = { background: string; layers: ParallaxLayer[]; glows: ParallaxGlow[]; scene?: ParallaxScene };

// Zoom do fundo: o suficiente para o deslocamento máximo (profundidade 0.3 × amplitude × ~1.5 de câmera, dos dois lados) nunca mostrar vazio.
export const bgScale = (amplitude: number) => 1 + 0.9 * amplitude + 0.002;
