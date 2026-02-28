interface Props {
  children: React.JSX.Element;
  animation: "awaitBottomAnimationFadInEnd" | "awaitBottomAnimatedGradientEnd";
}
/** @title Show Section Before Animation */
export default function ShowBeforeAnimation({ animation, children }: Props) {
  return <div className={animation}>{children}</div>;
}
