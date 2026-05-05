import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Search — LendLeaf" }] }),
});

function SearchPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Autofocus after route navigation
    inputRef.current?.focus();
  }, []);

  const submit = (value: string) => {
    navigate({
      to: "/browse",
      search: () => ({ q: value.trim() || undefined }),
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(q);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-3 sm:px-4 max-w-6xl py-4 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back"
              title="Back"
              onClick={() => navigate({ to: "/browse", search: {} })}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold">Search</h1>
          </div>

          <form onSubmit={onSubmit} role="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search books by title, author, ISBN…"
                className="pl-10 h-11 text-base sm:h-10 sm:text-sm"
                aria-label="Search"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" className="flex-1">
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQ("");
                  submit("");
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
