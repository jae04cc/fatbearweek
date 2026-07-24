"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Home, PawPrint, Trophy, ListChecks, BarChart3, Settings, CircleUser } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/bears", label: "Bears", icon: PawPrint },
  { href: "/bracket", label: "Bracket", icon: Trophy },
  { href: "/matchups", label: "Round", icon: ListChecks },
  { href: "/results", label: "Results", icon: BarChart3 },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  // Only true once actually detected client-side after mount (never during
  // SSR/first paint), so this can't affect anything until it's confirmed —
  // regular browser tabs (mobile Safari included) always render exactly as
  // before. "Add to Home Screen" apps on iOS drop Safari's own chrome
  // entirely, so this fixed bottom bar becomes the literal last thing on
  // screen, flush against the home indicator curve and rounded corners —
  // something Safari's own toolbar always used to buffer for us.
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone = nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    setIsStandaloneApp(standalone);
  }, []);

  if (status !== "authenticated" || pathname === "/login") return null;

  // The bootstrap operator account isn't a player — it has no bracket to fill out
  const links = [
    ...LINKS.filter((link) => !(link.href === "/bracket" && session?.user.isBootstrap)),
    ...(session?.user.isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
    { href: "/account", label: "Account", icon: CircleUser },
  ];

  return (
    <nav
      style={isStandaloneApp ? { paddingBottom: "24px" } : undefined}
      className="fixed inset-x-0 bottom-0 sm:sticky sm:inset-x-auto sm:bottom-auto sm:top-0 z-40 w-full border-t border-white/10 bg-surface/95 backdrop-blur-sm sm:border-t-0 sm:border-b"
    >
      <div
        className={cn(
          "mx-auto flex max-w-2xl items-stretch justify-between sm:justify-center sm:gap-1 sm:py-2",
          isStandaloneApp ? "px-4" : "px-1"
        )}
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5",
                "px-2 py-2 sm:px-3 sm:py-1.5 sm:rounded-xl text-xs sm:text-sm font-medium transition-colors",
                active ? "text-accent-light sm:bg-accent/15" : "text-neutral-400"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
