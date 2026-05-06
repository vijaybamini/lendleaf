import { Link, useNavigate } from "@tanstack/react-router";
import { Inbox, Plus, Search, PenSquare, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HomeHeader() {
  const navigate = useNavigate();

  const openSearch = (): void => {
    void navigate({ to: "/search" });
  };

  const openCompose = (): void => {
    void navigate({ to: "/posts", search: { compose: true } });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070a0f]/95 backdrop-blur-xl">
      {/* Top Navigation Bar */}
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:h-16 sm:px-4">
        <div className="flex min-w-0 justify-start">
          <Button
            asChild
            variant="ghost"
            className="h-10 gap-2 rounded-full px-3 text-zinc-100 hover:bg-white/10 hover:text-white"
          >
            <Link to="/requests" aria-label="Requests">
              <Inbox className="h-5 w-5" />
              <span className="hidden text-sm font-semibold sm:inline">Requests</span>
            </Link>
          </Button>
        </div>

        <Link
          to="/"
          className="font-serif text-xl font-semibold tracking-normal text-white sm:text-2xl"
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
                className="h-10 w-10 rounded-full text-zinc-100 hover:bg-white/10 hover:text-white"
                aria-label="Create"
                title="Create"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 border-white/10 bg-zinc-900 text-zinc-50"
            >
               <DropdownMenuItem asChild className="gap-2 focus:bg-white/10 focus:text-white">
                <Link to="/shelf">
                  <Library className="h-4 w-4" />
                  <span>Add to Shelf</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={openCompose}
                className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer"
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
          className="flex h-12 w-full items-center gap-3 rounded-full border border-white/10 bg-zinc-800/90 px-4 text-left text-zinc-400 shadow-inner transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Search"
        >
          <Search className="h-5 w-5 flex-shrink-0 text-zinc-300" />
          <span className="min-w-0 truncate text-base">Search books, posts, people</span>
        </button>
      </div>
    </header>
  );
}
