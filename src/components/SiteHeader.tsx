import { Link, useNavigate } from "@tanstack/react-router";
import { BookMarked, LogOut, Leaf } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-6xl">
        <Link to="/" className="flex items-center gap-2 group">
          <BookMarked className="h-6 w-6 text-primary transition-transform group-hover:-rotate-6" />
          <span className="font-serif text-xl font-semibold tracking-tight">LendLeaf</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/browse">Browse</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/shelf">My Shelf</Link>
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
              <Button onClick={handleSignOut} variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Join LendLeaf</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
