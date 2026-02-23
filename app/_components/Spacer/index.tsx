interface Props {
  desktop: number;
  mobile: number;
}

export default function Spacer(props: Props) {
  const cssVars = {
    "--spacer-desktop": `${props.desktop}px`,
    "--spacer-mobile": `${props.mobile}px`,
  } as React.CSSProperties;

  return (
    <div
      className="h-(--spacer-mobile) lg:h-(--spacer-desktop)"
      style={cssVars}
    />
  );
}