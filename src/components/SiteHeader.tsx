import { Link, useNavigate, useLocation, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookMarked, LogOut, Leaf, Search, Library, Inbox } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const search = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState("");

  // Sync local input with URL when on /browse
  useEffect(() => {
    if (location.pathname === "/browse") {
      setQuery(search.q ?? "");
    }
  }, [location.pathname, search.q]);

  const submitSearch = (value: string) => {
    navigate({
      to: "/browse",
      search: (prev) => ({
        ...prev,
        tab: "books" as const,
        q: value.trim() || undefined,
      }),
    });
  };

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center gap-2 sm:gap-3 px-3 sm:px-4 max-w-6xl">
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <BookMarked className="h-6 w-6 text-primary transition-transform group-hover:-rotate-6" />
          <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight hidden xs:inline sm:inline">
            LendLeaf
          </span>
        </Link>

        {user && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
            className="flex-1 max-w-md mx-1 sm:mx-2"
            role="search"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (location.pathname === "/browse") submitSearch(e.target.value);
                }}
                onFocus={() => {
                  if (location.pathname !== "/browse") {
                    navigate({ to: "/browse", search: { tab: "books" } });
                  }
                }}
                placeholder="Search books to borrow…"
                className="pl-8 h-9 text-sm"
                aria-label="Search books"
              />
            </div>
          </form>
        )}

        <nav className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" title="My Shelf" aria-label="My Shelf">
                <Link to="/shelf">
                  <Library className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" title="Requests" aria-label="Requests">
                <Link to="/requests">
                  <Inbox className="h-5 w-5" />
                </Link>
              </Button>
              {credits !== null && (
                <div
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  title={`${credits} Leaf Credit${credits === 1 ? "" : "s"}`}
                  aria-label={`${credits} Leaf Credits`}
                >
                  <Leaf className="h-3.5 w-3.5" />
                  <span>{credits}</span>
                </div>
              )}
              <Button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
                variant="ghost"
                size="icon"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Join</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
