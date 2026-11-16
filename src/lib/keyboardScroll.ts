// Rolagem suave pelas setas ⬆/⬇: em vez de animar entre dois pontos (cada passo acelerava e freava, e a tecla segurada
// engasgava), a página tem uma VELOCIDADE que sobe até MAX_SPEED enquanto a tecla está apertada e desce até 0 ao soltar.
// O loop de rAF só integra posição += velocidade × dt, então repetir keydown, inverter a direção ou soltar no meio
// nunca reinicia nada: a velocidade só muda de forma contínua.

const MAX_SPEED = 400; // px/s com a tecla segurada
const ACCEL_TIME = 200; // ms de 0 até MAX_SPEED
const DECEL_TIME = 200; // ms de MAX_SPEED até 0
const MIN_HOLD = 200; // ms: um toque rápido conta como segurar por esse tempo (anda ~MAX_SPEED × 0,2 s no total)
const MIN_STOP_SPEED = 10; // px/s: abaixo disso, sem tecla, para
const MAX_DT = 0.05; // s: aba em segundo plano / frame perdido não vira salto

type Dir = 1 | -1;
const KEYS: Record<string, Dir> = { ArrowDown: 1, ArrowUp: -1 };
// Componentes que usam as setas para navegação própria.
const OWN_ARROWS = '[role="tab"],[role="tablist"],[role="slider"],[role="listbox"],[role="menu"],[role="menubar"],[role="radiogroup"],[role="grid"],[role="tree"]';
const EDITABLE = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';

const pressed = new Set<Dir>();
const holdUntil = new Map<Dir, number>(); // toque curto: a direção segue ativa até este instante
let velocity = 0; // px/s, positivo = para baixo
let pos = 0; // posição em float (scrollY é arredondado pelo navegador; acumular nele travaria em velocidades baixas)
let last = 0;
let frame = 0;

function active(dir: Dir, now: number) {
  return pressed.has(dir) || (holdUntil.get(dir) ?? 0) > now;
}

function stop() {
  pressed.clear();
  holdUntil.clear();
  velocity = 0;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

function tick(now: number) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;

  // As duas setas juntas se anulam (freia até parar, mas o loop segue vivo); soltar uma delas inverte suavemente.
  const down = active(1, now);
  const up = active(-1, now);
  const dir = (down ? 1 : 0) - (up ? 1 : 0);
  const target = dir * MAX_SPEED;
  const braking = velocity !== 0 && (Math.sign(target) !== Math.sign(velocity) || Math.abs(target) < Math.abs(velocity));
  const step = (MAX_SPEED / ((braking ? DECEL_TIME : ACCEL_TIME) / 1000)) * dt;
  velocity += Math.max(-step, Math.min(step, target - velocity));

  if (!down && !up && Math.abs(velocity) < MIN_STOP_SPEED) return stop();

  // Algo além de nós mexeu na rolagem (link âncora, layout mudou): segue de onde a página está.
  if (Math.abs(window.scrollY - pos) > 2) pos = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  pos += velocity * dt;
  if (pos <= 0 || pos >= max) {
    pos = Math.max(0, Math.min(max, pos));
    velocity = 0; // bateu na borda: não acumula velocidade "contra a parede"
  }
  // "instant" ignora o scroll-behavior: smooth do <html> (o loop já anima).
  window.scrollTo({ top: pos, behavior: "instant" });

  frame = requestAnimationFrame(tick);
}

function scrollLocked() {
  const { documentElement: html, body } = document;
  return [html, body].some((el) => getComputedStyle(el).overflowY === "hidden") || !!document.querySelector("dialog[open]");
}

// Foco dentro de um contêiner com rolagem própria: as setas rolam ele, não a página.
function insideScroller(el: Element | null) {
  for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

function shouldIgnore(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return true;
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest(EDITABLE) || target?.closest(OWN_ARROWS)) return true;
  // Sem animação: deixa a seta nativa do navegador.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  return scrollLocked() || insideScroller(target);
}

export function initKeyboardScroll() {
  window.addEventListener("keydown", (e) => {
    const dir = KEYS[e.key];
    if (!dir || shouldIgnore(e)) return;
    e.preventDefault();
    if (pressed.has(dir)) return; // auto-repeat da tecla segurada: nada muda
    pressed.add(dir);
    holdUntil.set(dir, performance.now() + MIN_HOLD);
    if (!frame) {
      pos = window.scrollY;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  });

  window.addEventListener("keyup", (e) => {
    const dir = KEYS[e.key];
    if (dir) pressed.delete(dir); // o loop freia sozinho (respeitando o MIN_HOLD do toque)
  });

  // O usuário assumiu a rolagem (ou a página perdeu o foco e o keyup pode nunca chegar): para na hora.
  for (const type of ["wheel", "mousedown", "touchstart"] as const) {
    window.addEventListener(type, () => frame && stop(), { passive: true });
  }
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => document.hidden && stop());
}
