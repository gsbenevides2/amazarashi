import { existsSync } from "node:fs";
import { loadOrt, sharp } from "./native";

// Segmentação do elemento principal no próprio processo (onnxruntime-node + isnet-general-use), a mesma receita do rembg:
// entrada 1024×1024 normalizada, saída min-max → máscara 0..255. Sem Python nem serviço externo.
const MODEL = process.env.SEGMENT_MODEL_PATH || "models/isnet-general-use.onnx"; // baixado no build do Docker (veja Dockerfile)
export const SEG = 1024; // o modelo só aceita 1024×1024
const MEAN = [0.485, 0.456, 0.406];

export const segmentAvailable = () => existsSync(MODEL);

// rgb: w×h×3. Devolve a máscara SEG×SEG (0..255) do elemento principal.
// A sessão nasce e morre a cada chamada: sem arena e sem otimização de grafo o pico é ~0.9 GB (com os padrões passava de 2 GB) e a memória volta logo.
export async function segmentMask(rgb: Buffer, w: number, h: number) {
  const ort = loadOrt(); // o addon nativo só carrega quando alguém sobe uma capa
  const px = await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).resize(SEG, SEG, { fit: "fill", kernel: "lanczos3" }).raw().toBuffer();
  const n = SEG * SEG;
  let max = 1e-6;
  for (const v of px) if (v > max) max = v;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) input[c * n + i] = px[i * 3 + c] / max - MEAN[c];
  const session = await ort.InferenceSession.create(MODEL, { enableCpuMemArena: false, enableMemPattern: false, graphOptimizationLevel: "disabled", intraOpNumThreads: 2 });
  try {
    // o modelo tem 12 saídas (as 11 extras são mapas de features enormes): pede só a primeira
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SEG, SEG]) }, [session.outputNames[0]]);
    const pred = out[session.outputNames[0]].data as Float32Array;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { if (pred[i] < lo) lo = pred[i]; if (pred[i] > hi) hi = pred[i]; }
    const mask = Buffer.alloc(n);
    for (let i = 0; i < n; i++) mask[i] = Math.round(((pred[i] - lo) / (hi - lo || 1)) * 255);
    return mask;
  } finally {
    await session.release();
  }
}
