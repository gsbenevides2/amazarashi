const on = "group-hover/p:[stroke-dasharray:552,552] group-focus-visible/p:[stroke-dasharray:552,552] [@media(hover:none)]:[stroke-dasharray:552,552]";
const on2 = "group-hover/p:[stroke-dasharray:290,290] group-focus-visible/p:[stroke-dasharray:290,290] [@media(hover:none)]:[stroke-dasharray:290,290]";
const draw = "transition-[stroke-dasharray] duration-600 motion-reduce:transition-none";

// Ícone de play do site: anel e triângulo se desenham no hover/foco (sempre desenhado no touch).
// O pai precisa ser `relative` e ter a classe `group/p`.
export default function PlayIcon() {
  return (
    <span className="absolute left-1/2 top-1/2 size-15 -translate-x-1/2 -translate-y-1/2 sm:size-25" aria-hidden>
      <svg viewBox="0 0 180 180" className="absolute inset-0 size-full -rotate-90 fill-none stroke-fg stroke-2">
        <circle cx="90" cy="90" r="88" className={`${draw} [stroke-dasharray:0,552] ${on}`} />
      </svg>
      <svg viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 ml-[-14%] mt-[-20%] size-2/5 fill-none stroke-fg stroke-3">
        <path d="M 95,50 5,95 5,5 z" className={`${draw} duration-700 [stroke-dasharray:0,290] ${on2}`} />
      </svg>
    </span>
  );
}
