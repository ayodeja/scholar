"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Library, Compass, ChartNoAxesColumnIncreasing, Sparkles } from "lucide-react";

const items = [
  { href: "/home", label: "Home", icon: House },
  { href: "/library", label: "Library", icon: Library },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 flex items-end justify-around border-t border-border bg-canvas px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2">
      {items.slice(0, 2).map((item) => (
        <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
      ))}
      <Link href="/tutor" className="flex flex-1 flex-col items-center gap-[3px] pt-0" style={{ marginTop: -22 }}>
        <span className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-blue text-white shadow-[0_4px_14px_rgba(27,58,107,0.35)]">
          <Sparkles size={22} />
        </span>
        <span className="text-[10.5px] font-semibold text-gray-light">Ask Scholar</span>
      </Link>
      {items.slice(2).map((item) => (
        <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
      ))}
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof House; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-[3px] py-1 text-[10.5px] font-semibold ${active ? "text-blue" : "text-gray-light"}`}>
      <Icon size={21} />
      <span>{label}</span>
    </Link>
  );
}
