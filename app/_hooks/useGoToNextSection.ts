import { useCallback } from "react";

export function useGoToNextSection() {
  const getElementInsideBody = useCallback((element: HTMLElement) => {
    let finededElement = element.parentElement;
    while (finededElement) {
      const parentElement = finededElement.parentElement;
      const isBodyElement = parentElement?.tagName === "BODY";
      if (isBodyElement) {
        break;
      }
      finededElement = parentElement;
    }
    if (!finededElement) return;
    return finededElement;
  }, []);
  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      const parentElement = getElementInsideBody(event.currentTarget);
      if (!parentElement) return;
      parentElement.nextElementSibling?.scrollIntoView({ behavior: "smooth" });
    },
    [getElementInsideBody],
  );
}
