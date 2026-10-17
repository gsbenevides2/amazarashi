// Seta do amazarashi.com: chevron + anel; no hover (do ancestral .group/a) o chevron desce e o anel sobe, e tudo desliza 5px.
// ponytail: só reage em botões habilitados (group-[:not(:disabled):hover]).
const t = "transition-transform duration-700 ease-out-cubic motion-reduce:transition-none";

export default function ArrowIcon({ direction, className = "" }: { direction: "prev" | "next"; className?: string }) {
  const next = direction === "next";
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${t} ${next ? "group-[:not(:disabled):hover]/a:translate-x-1.25" : "group-[:not(:disabled):hover]/a:-translate-x-1.25"} ${className}`}
    >
      <svg viewBox="0 0 73 50" fill="currentColor" className={`block h-auto w-4 overflow-visible ${next ? "-rotate-90" : "rotate-90"}`}>
        <polygon className={`${t} group-[:not(:disabled):hover]/a:translate-y-1.5`} points="36.5 50 0 1.4 1.9 0 36.5 46.1 71.1 0 73 1.4 36.5 50" />
        <path className={`${t} group-[:not(:disabled):hover]/a:-translate-y-1.5`} d="M36.5,21.3A10.7,10.7,0,1,1,47.2,10.7,10.7,10.7,0,0,1,36.5,21.3Zm0-18.9a8.3,8.3,0,1,0,8.3,8.3A8.3,8.3,0,0,0,36.5,2.4Z" />
      </svg>
    </span>
  );
}
