import { Link, useLocation } from "@tanstack/react-router";
import { CircleUserRound, Home, MessageCircle, Search, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

type BottomNavPath = "/" | "/search" | "/messages" | "/profile";

function NavItem({
  to,
  label,
  icon: Icon,
  isActive,
}: {
  to: BottomNavPath;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2",
        "text-[11px] font-medium transition-colors",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      aria-label={label}
    >
      {isActive && (
        <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
      )}
      <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
      <span className="max-w-full truncate leading-none">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const pathname = location.pathname;
  const is = (path: BottomNavPath): boolean =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav
      className={[
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/80 bg-card/95 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
      ].join(" ")}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex h-16 max-w-6xl px-1.5">
        <NavItem to="/" label="Home" icon={Home} isActive={is("/")} />
        <NavItem to="/search" label="Search" icon={Search} isActive={is("/search")} />
        <NavItem to="/messages" label="Messages" icon={MessageCircle} isActive={is("/messages")} />
        <NavItem to="/profile" label="Profile" icon={CircleUserRound} isActive={is("/profile")} />
      </div>
    </nav>
  );
}
