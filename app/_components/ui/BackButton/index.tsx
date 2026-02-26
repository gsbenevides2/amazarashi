"use client";

interface BackButtonProps {
  className?: string;
  children: React.ReactNode;
}

export default function BackButton({ children, className }: BackButtonProps) {
  const goBack = () => {
    history.back();
  };
  return (
    <>
      <a onClick={goBack} className={className}>
        {children}
      </a>
    </>
  );
}
