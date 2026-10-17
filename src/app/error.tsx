"use client";

import Link from "next/link";
import ErrorScreen from "../components/layout/ErrorScreen";
import { outlineButton } from "../components/links";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorScreen code="500" title="Atrito demais" text="Entre a velocidade e o atrito (スピードと摩擦), algo se partiu do nosso lado. Tente novamente em instantes.">
      <button type="button" onClick={() => retry()} className={`cursor-pointer ${outlineButton}`}>TENTAR NOVAMENTE</button>
      <Link href="/" className={outlineButton}>VOLTAR PARA O INÍCIO</Link>
    </ErrorScreen>
  );
}
