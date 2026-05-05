import { Link, useLocation } from "@tanstack/react-router";
import { Inbox, MessageCircle, PenSquare, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";

function NavItem({
  to,
  label,
  icon: Icon,
  isActive,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate leading-none">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const pathname = location.pathname;
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <>
      {/* Spacer so content isn't hidden behind fixed nav */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />

      <nav
        className={[
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          "border-t border-border/70 bg-background/90 backdrop-blur",
          "pb-[env(safe-area-inset-bottom)]",
        ].join(" ")}
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="mx-auto flex h-16 max-w-6xl px-1.5">
          <NavItem to="/browse" label="Browse" icon={BookOpen} isActive={is("/browse")} />
          <NavItem to="/posts" label="Posts" icon={PenSquare} isActive={is("/posts")} />
          <NavItem to="/requests" label="Requests" icon={Inbox} isActive={is("/requests")} />
          <NavItem to="/messages" label="Messages" icon={MessageCircle} isActive={is("/messages")} />
        </div>
      </nav>
    </>
  );
}
