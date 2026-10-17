// Título de seção: horizontal no mobile, vertical ao lado do conteúdo em xl (o pai precisa ser `relative`).
export default function SectionTitle({ id, className = "", children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={`font-latin text-[clamp(26px,8vw,32px)] uppercase md:text-[clamp(32px,12vw,47.5px)] xl:absolute xl:right-full xl:top-0 xl:mb-0 xl:mr-6 xl:[writing-mode:vertical-rl] xl:rotate-180 ${className}`}>
      {children}
    </h2>
  );
}
