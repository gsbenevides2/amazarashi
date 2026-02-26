import { SVGAttributes } from "react";

export type AvailableIcons =
  | "ChevronLeft"
  | "ChevronRight"
  | "ChevronUp"
  | "ChevronDown"
  | "QuestionMarkCircle"
  | "User"
  | "ShoppingCart"
  | "Bars3"
  | "Heart"
  | "MagnifyingGlass"
  | "XMark"
  | "Plus"
  | "Minus"
  | "MapPin"
  | "Phone"
  | "Elo"
  | "Mastercard"
  | "Visa"
  | "Pix"
  | "Logo"
  | "Facebook"
  | "Instagram"
  | "Tiktok"
  | "Truck"
  | "Discount"
  | "Return"
  | "CreditCard"
  | "Deco"
  | "Discord"
  | "Trash"
  | "FilterList"
  | "WhatsApp"
  | "ArrowsPointingOut"
  | "ArrowBack"
  | "Spotify"
  | "YoutubeMusic"
  | "music_album"
  | "music_disc"
  | "pencil"
  | "view"
  | "AmazonMusic"
  | "Deezer"
  | "AppleMusic"
  | "X"
  | "Tiktok"
  | "Youtube";
interface Props extends SVGAttributes<SVGSVGElement> {
  /**
   * Symbol id from element to render. Take a look at `/static/icons.svg`.
   *
   * Example: <Icon id="Bell" />
   */
  id: AvailableIcons;
  size?: number;
}

function Icon({ id, strokeWidth, size, width, height, ...otherProps }: Props) {
  if (strokeWidth === undefined && id === "Tiktok") {
    strokeWidth = 3;
  } else if (strokeWidth === undefined) {
    strokeWidth = 16;
  }
  return (
    <svg
      {...otherProps}
      width={width ?? size}
      height={height ?? size}
      strokeWidth={strokeWidth}
    >
      <use href={`/sprites.svg#${id}`} />
    </svg>
  );
}

export default Icon;
