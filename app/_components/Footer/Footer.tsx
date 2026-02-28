import Link from "next/link";
import Icon, { AvailableIcons } from "../ui/Icon";
import AmazarashiLogo from "./AmazarashiLogo";
import ApologiesLogo from "./Apologieslogo";

interface FooterProps {
  menuItens: {
    label: string;
    href: string;
  }[];
  socialNetworks: {
    label: string;
    href: string;
    icon: AvailableIcons;
  }[];
}

export default function Footer({ menuItens, socialNetworks }: FooterProps) {
  return (
    <footer className="bg-gray-700 py-8 border-gray-800 border-t text-white">
      <div className="mx-auto px-4 container">
        <div className="flex md:flex-row flex-col justify-between items-start">
          {/* Logo and Menu Section */}
          <div className="mb-6 md:mb-0 w-full lg:w-fit">
            <Link href="/" className="lg:block flex mx-auto lg:mx-0 mb-4 w-fit">
              <AmazarashiLogo />
            </Link>
          </div>
          {/* Menu Section */}
          <div className="mb-6 md:mb-0">
            <nav>
              <span className="block mb-2 font-bold text-sm">Ir para:</span>
              <ul className="space-y-1">
                {menuItens.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {/* Social Media Section */}
          <div className="mb-6 md:mb-0">
            <div className="flex flex-col gap-2 mb-2">
              <span className="mb-2 font-bold text-sm">Redes Sociais:</span>
              <div className="flex flex-row lg:flex-col flex-wrap gap-2">
                {socialNetworks.map((item) => (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2"
                    key={item.label}
                  >
                    <Icon
                      size={24}
                      id={item.icon}
                      strokeWidth={item.icon === "Tiktok" ? 3 : 16}
                    />
                    <span className="hidden lg:block">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {/* FanClub Section */}
          <Link href="https://apologies.jp/">
            <span className="mb-2 font-bold text-sm">FanClub:</span>
            <ApologiesLogo />
          </Link>
        </div>
      </div>
    </footer>
  );
}
