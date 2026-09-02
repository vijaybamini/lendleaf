import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, Plus, Search, PenSquare, Library } from "lucide-react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { Button } from "@/components/ui/button";
import { usePendingRequestsCount } from "@/hooks/use-notification-badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HomeHeader() {
  const navigate = useNavigate();
  const [addBookOpen, setAddBookOpen] = useState(false);
  const pendingRequests = usePendingRequestsCount();

  const openSearch = (): void => {
    void navigate({ to: "/search" });
  };

  const openCompose = (): void => {
    void navigate({ to: "/posts", search: { compose: true } });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        {/* Top Navigation Bar */}
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:h-16 sm:px-4">
          <div className="flex min-w-0 justify-start">
            <Button
              asChild
              variant="ghost"
              className="h-10 gap-2 rounded-full px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Link to="/requests" aria-label={pendingRequests > 0 ? "Requests (new)" : "Requests"}>
                <span className="relative">
                  <Inbox className="h-5 w-5" />
                  {pendingRequests > 0 && (
                    <span
                      className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="hidden text-sm font-semibold sm:inline">Requests</span>
              </Link>
            </Button>
          </div>

          <Link
            to="/"
            className="font-serif text-xl font-semibold tracking-normal text-foreground sm:text-2xl"
            aria-label="Lend Leaf home"
          >
            Lend Leaf
          </Link>

          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Create"
                  title="Create"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-border bg-popover text-popover-foreground shadow-paper"
              >
                <DropdownMenuItem
                  onClick={() => setAddBookOpen(true)}
                  className="cursor-pointer gap-2 focus:bg-accent focus:text-accent-foreground"
                >
                  <Library className="h-4 w-4" />
                  <span>Add to Shelf</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openCompose}
                  className="cursor-pointer gap-2 focus:bg-accent focus:text-accent-foreground"
                >
                  <PenSquare className="h-4 w-4" />
                  <span>Add Post</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Sub-Header (Home only) */}
        <div className="mx-auto max-w-6xl px-3 pb-3 sm:px-4">
          <button
            type="button"
            onClick={openSearch}
            className="flex h-12 w-full items-center gap-3 rounded-full border border-border bg-card px-4 text-left text-muted-foreground shadow-inner transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Search"
          >
            <Search className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-base">Search books, posts, people</span>
          </button>
        </div>
      </header>

      <AddBookDialog
        open={addBookOpen}
        onOpenChange={setAddBookOpen}
        onAdded={() => navigate({ to: "/profile" })}
      />
    </>
  );
}
