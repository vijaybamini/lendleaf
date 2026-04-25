import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Users, Sprout, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "LendLeaf — Share books with people you trust" },
      { name: "description", content: "Build your shelf, lend to friends, borrow from neighbors. A quiet place for book lovers." },
    ],
  }),
});

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-4 max-w-6xl py-20 md:py-32">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
                  <Sprout className="h-3.5 w-3.5 text-primary" />
                  Peer-to-peer book sharing
                </div>
                <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-balance">
                  Books are <em className="text-primary not-italic">better</em> when shared.
                </h1>
                <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">
                  Catalog your collection, lend to friends, and discover what your neighbors are reading. A quiet little library, between people.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {user ? (
                    <Button asChild size="lg">
                      <Link to="/browse">
                        Browse books <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="lg">
                        <Link to="/signup">
                          Start your shelf <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="lg" variant="outline">
                        <Link to="/login">I have an account</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Decorative book stack */}
              <div className="relative hidden md:block">
                <div className="relative h-[420px] flex items-end justify-center gap-3">
                  {[
                    { h: 280, c: "oklch(0.42 0.09 145)", t: "Walden", a: "Thoreau" },
                    { h: 340, c: "oklch(0.55 0.12 35)", t: "Beloved", a: "Morrison" },
                    { h: 300, c: "oklch(0.35 0.06 250)", t: "Dune", a: "Herbert" },
                    { h: 360, c: "oklch(0.5 0.13 75)", t: "The Odyssey", a: "Homer" },
                    { h: 290, c: "oklch(0.32 0.05 20)", t: "Middlemarch", a: "Eliot" },
                  ].map((b, i) => (
                    <div
                      key={i}
                      className="w-16 rounded-sm shadow-book flex flex-col justify-between p-2 text-[10px] text-paper/90 transition-transform hover:-translate-y-2"
                      style={{
                        height: b.h,
                        background: `linear-gradient(135deg, ${b.c}, color-mix(in oklab, ${b.c} 70%, black))`,
                        transform: `rotate(${(i - 2) * 1.2}deg)`,
                      }}
                    >
                      <div className="font-serif leading-tight">{b.t}</div>
                      <div className="opacity-70">{b.a}</div>
                    </div>
                  ))}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] h-3 bg-foreground/10 blur-md rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="container mx-auto px-4 max-w-6xl py-20">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: BookOpen,
                  title: "Catalog your shelf",
                  body: "Search any title or ISBN — we'll pull the cover and details from Google Books in a tap.",
                },
                {
                  icon: Users,
                  title: "Lend to people you trust",
                  body: "Keep track of who has what. No more wondering where your favorite paperback wandered off to.",
                },
                {
                  icon: Sprout,
                  title: "Grow your reading",
                  body: "Discover books your friends and neighbors love — borrow, return, repeat.",
                },
              ].map((f) => (
                <div key={f.title} className="paper-card rounded-lg p-6">
                  <f.icon className="h-7 w-7 text-primary mb-4" strokeWidth={1.5} />
                  <h3 className="font-serif text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip */}
        {!user && (
          <section className="container mx-auto px-4 max-w-6xl py-20 text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
              Open the cover.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Free, friendly, and built for readers who like the smell of paper.
            </p>
            <Button asChild size="lg">
              <Link to="/signup">Create your account</Link>
            </Button>
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} LendLeaf · A small library between friends</p>
      </footer>
    </div>
  );
}
