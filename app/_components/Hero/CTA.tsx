"use client";

import { useGoToNextSection } from "@/app/_hooks/useGoToNextSection";

export function HeroCTA({ cta }: { cta: { label: string } }) {
  const handleClick = useGoToNextSection();
  return (
    <a className="mt-6 cursor-pointer animated" onClick={handleClick}>
      {cta.label}
    </a>
  );
}
