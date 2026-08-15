import { Link, useNavigate, useLocation, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookMarked,
  LogOut,
  Leaf,
  Search,
  Library,
  Inbox,
  MessageCircle,
  X,
  PenSquare,
  Menu,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const search = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState("");

  const onSearch = location.pathname === "/search";

  // Sync local input with URL when on /search
  useEffect(() => {
    if (onSearch) {
      setQuery(search.q ?? "");
    } else {
      setQuery("");
    }
  }, [onSearch, search.q]);

  const submitSearch = (value: string) => {
    navigate({
      to: "/search",
      search: () => ({
        q: value.trim() || undefined,
      }),
    });
  };

  const handleSearchIconClick = () => {
    // Always navigate to the dedicated search experience.
    // This gives a consistent "tap search → get a search bar" behavior on mobile + desktop.
    const existing = onSearch ? (search.q ?? "") : "";
    navigate({
      to: "/search",
      search: () => ({ q: existing.trim() || undefined }),
    });
  };

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 sm:h-16 items-center gap-2 sm:gap-3 px-3 sm:px-4 max-w-6xl">
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <BookMarked className="h-6 w-6 text-primary transition-transform group-hover:-rotate-6" />
          <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight hidden sm:inline">
            LendLeaf
          </span>
        </Link>

        <div className="flex-1" />

        <nav className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {user ? (
            <>
              {/* Mobile overflow menu (mobile uses bottom navigation for primary actions) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Menu"
                    title="Menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px]">
                  <SheetHeader>
                    <SheetTitle className="font-serif">Menu</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-2">
                    <Link
                      to="/search"
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <Search className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Search</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <Library className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">My Shelf</span>
                    </Link>
                    <Link
                      to="/requests"
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <Inbox className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Requests</span>
                    </Link>
                    <Link
                      to="/messages"
                      search={{ to: undefined }}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Messages</span>
                    </Link>
                    <Link
                      to="/posts"
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <PenSquare className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Posts</span>
                    </Link>
                  </div>

                  {credits !== null && (
                    <div className="mt-6 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Leaf className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {credits} Leaf Credit{credits === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lend books to earn more credits.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-border">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-center">
                          <LogOut className="h-4 w-4 mr-2" /> Sign out
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sign out?</AlertDialogTitle>
                          <AlertDialogDescription>Do you want to confirm?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={async () => {
                              await signOut();
                              navigate({ to: "/" });
                            }}
                          >
                            Sign out
                          </AlertDialogCancel>
                          <AlertDialogAction>Cancel</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop nav icons (mobile uses bottom navigation) */}
              <div className="hidden md:flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Search books"
                  aria-label="Search books"
                  onClick={handleSearchIconClick}
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button asChild variant="ghost" size="icon" title="My Shelf" aria-label="My Shelf">
                  <Link to="/profile">
                    <Library className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Requests" aria-label="Requests">
                  <Link to="/requests">
                    <Inbox className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  title="Posts"
                  aria-label="Posts & Write"
                >
                  <Link to="/posts">
                    <PenSquare className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Messages" aria-label="Messages">
                  <Link to="/messages" search={{ to: undefined }}>
                    <MessageCircle className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
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
              {/* Desktop sign out */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Sign out"
                    aria-label="Sign out"
                    className="hidden md:inline-flex"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out?</AlertDialogTitle>
                    <AlertDialogDescription>Do you want to confirm?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={async () => {
                        await signOut();
                        navigate({ to: "/" });
                      }}
                    >
                      Sign out
                    </AlertDialogCancel>
                    <AlertDialogAction>Cancel</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
      {user && !onSearch && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(query);
          }}
          className="border-t border-border/50 px-3 pb-3 pt-2 md:hidden"
          role="search"
        >
          <div className="relative mx-auto max-w-6xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books"
              className="h-11 rounded-full bg-muted pl-10 pr-10 text-base"
              aria-label="Search books"
              autoComplete="off"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                }}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      )}
    </header>
  );
}
