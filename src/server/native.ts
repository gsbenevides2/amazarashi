import { createRequire } from "node:module";
import type SharpFn from "sharp";

// Pacotes nativos (sharp, onnxruntime-node) carregados em runtime a partir da raiz do projeto, fora do alcance do Turbopack.
// Motivo: o Turbopack os troca por um nome com hash (ex.: "sharp-20c6a5da…") resolvido por um link em .next/dev/node_modules, criado só na primeira
// requisição; o `import()` do Bun já tinha guardado que essa pasta não existia e responde "Cannot find package" (500 no /admin em dev).
// Com createRequire o Turbopack não enxerga o pacote e o Bun resolve normalmente em node_modules (em produção, /app/node_modules).
const req = createRequire(`${process.cwd()}/package.json`);

export const sharp = req("sharp") as typeof SharpFn;
export const loadOrt = () => req("onnxruntime-node") as typeof import("onnxruntime-node");
